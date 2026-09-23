"""Server-only Operator API. Never return upstream errors or raw WC objects."""
import asyncio
import hashlib
import hmac
import json
import os
import uuid
from datetime import datetime, timezone
from urllib.parse import urlsplit

import asyncpg
import httpx
from fastapi import APIRouter, Request
from pydantic import BaseModel, ConfigDict, Field, StrictStr, ValidationError
from starlette.responses import JSONResponse


class OperatorError(Exception):
    def __init__(self, status, code):
        self.status, self.code = status, code


class Rename(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    name: StrictStr = Field(min_length=1, max_length=200)
    reason: StrictStr = Field(min_length=1, max_length=500)
    expected_version: StrictStr = Field(pattern=r"^[a-f0-9]{64}$")
    idempotency_key: StrictStr = Field(pattern=r"^[A-Za-z0-9_-]{16,128}$")


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=True,
                                     separators=(",", ":")).encode()).hexdigest()


def product_view(raw):
    if not isinstance(raw, dict) or not isinstance(raw.get("id"), int):
        raise OperatorError(502, "INVALID_UPSTREAM_RESPONSE")
    # Hash the complete resource to detect changes outside the editable field.
    return {"id": raw["id"], "name": raw.get("name", ""),
            "slug": raw.get("slug", ""), "status": raw.get("status", ""),
            "type": raw.get("type", ""), "version": digest(raw)}


class WooClient:
    async def call(self, method, path, params=None, payload=None):
        base = os.getenv("WC_REST_URL", "").rstrip("/")
        key = os.getenv("WC_REST_CONSUMER_KEY", "")
        secret = os.getenv("WC_REST_CONSUMER_SECRET", "")
        parsed = urlsplit(base)
        if (parsed.scheme != "https" or not parsed.hostname or parsed.username
                or parsed.password or parsed.query or parsed.fragment
                or not key or not secret):
            raise OperatorError(503, "WOOCOMMERCE_NOT_CONFIGURED")
        try:
            async with httpx.AsyncClient(timeout=20, follow_redirects=False) as client:
                response = await client.request(
                    method, base + "/wp-json/wc/v3/" + path,
                    auth=(key, secret), params=params, json=payload,
                    headers={"Cache-Control": "no-cache"})
            if response.status_code == 404:
                raise OperatorError(404, "PRODUCT_NOT_FOUND")
            if not 200 <= response.status_code < 300:
                raise OperatorError(502, "WOOCOMMERCE_ERROR")
            return response.json(), response.headers
        except (httpx.HTTPError, ValueError):
            raise OperatorError(502, "WOOCOMMERCE_UNAVAILABLE") from None

    async def get(self, product_id):
        raw, _ = await self.call("GET", f"products/{product_id}")
        view = product_view(raw)
        if view["id"] != product_id:
            raise OperatorError(502, "INVALID_UPSTREAM_RESPONSE")
        return view

    async def rename(self, product_id, name):
        await self.call("PUT", f"products/{product_id}", payload={"name": name})


class PostgresStore:
    """Supabase/Postgres persistence for audit records and product locks."""

    _SAVE_COLUMNS = {
        "state": ("state", False),
        "before": ("before_payload", True),
        "after": ("after_payload", True),
        "result": ("result_payload", True),
        "http_status": ("http_status", False),
    }

    def __init__(self, database_url=None):
        self.database_url = database_url or ""
        self._pool = None
        self._pool_lock = asyncio.Lock()

    async def _get_pool(self):
        if not self.database_url:
            raise OperatorError(503, "AUDIT_NOT_CONFIGURED")
        if self._pool is None:
            async with self._pool_lock:
                if self._pool is None:
                    try:
                        self._pool = await asyncpg.create_pool(
                            dsn=self.database_url,
                            min_size=1,
                            max_size=5,
                            command_timeout=20,
                            statement_cache_size=0,
                        )
                    except Exception:
                        raise OperatorError(503, "AUDIT_UNAVAILABLE") from None
        return self._pool

    @staticmethod
    def _record(row):
        if row is None:
            return None
        record = dict(row)
        for field in ("operation_id", "created_at"):
            if record.get(field) is not None:
                record[field] = str(record[field])
        for field in ("before", "after", "result"):
            value = record.get(field)
            if isinstance(value, str):
                record[field] = json.loads(value)
        return record

    async def find(self, key):
        pool = await self._get_pool()
        row = await pool.fetchrow(
            """SELECT operation_id, product_id, fingerprint, reason, actor,
                      created_at, state, before_payload AS before,
                      after_payload AS after, result_payload AS result, http_status
               FROM public.operator_audit
               WHERE idempotency_key_hash = $1""",
            key,
        )
        return self._record(row)

    async def reserve(self, key, record):
        pool = await self._get_pool()
        row = await pool.fetchrow(
            """INSERT INTO public.operator_audit
                   (idempotency_key_hash, operation_id, product_id, fingerprint,
                    reason, actor, created_at, state, before_payload, after_payload)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb)
               ON CONFLICT (idempotency_key_hash) DO NOTHING
               RETURNING idempotency_key_hash""",
            key,
            uuid.UUID(record["operation_id"]),
            record["product_id"],
            record["fingerprint"],
            record["reason"],
            record["actor"],
            datetime.fromisoformat(record["created_at"]),
            record["state"],
            json.dumps(record.get("before")),
            json.dumps(record.get("after")),
        )
        return row is not None

    async def lock(self, product_id, operation_id):
        pool = await self._get_pool()
        row = await pool.fetchrow(
            """INSERT INTO public.operator_locks (product_id, operation_id)
               VALUES ($1, $2)
               ON CONFLICT (product_id) DO NOTHING
               RETURNING product_id""",
            product_id,
            uuid.UUID(operation_id),
        )
        return row is not None

    async def unlock(self, product_id, operation_id):
        pool = await self._get_pool()
        await pool.execute(
            """DELETE FROM public.operator_locks
               WHERE product_id = $1 AND operation_id = $2""",
            product_id,
            uuid.UUID(operation_id),
        )

    async def save(self, key, fields):
        if not fields:
            return
        unknown = set(fields) - self._SAVE_COLUMNS.keys()
        if unknown:
            raise OperatorError(500, "INVALID_AUDIT_UPDATE")
        assignments, values = [], []
        for field, value in fields.items():
            column, is_json = self._SAVE_COLUMNS[field]
            values.append(json.dumps(value) if is_json else value)
            cast = "::jsonb" if is_json else ""
            assignments.append(f"{column} = ${len(values)}{cast}")
        values.append(key)
        pool = await self._get_pool()
        await pool.execute(
            f"UPDATE public.operator_audit SET {', '.join(assignments)} "
            f"WHERE idempotency_key_hash = ${len(values)}",
            *values,
        )

    async def audit(self, page, size):
        pool = await self._get_pool()
        rows = await pool.fetch(
            """SELECT operation_id, product_id, reason, actor, created_at, state,
                      before_payload AS before, after_payload AS after,
                      result_payload AS result, http_status
               FROM public.operator_audit
               ORDER BY created_at DESC
               LIMIT $1 OFFSET $2""",
            size,
            (page - 1) * size,
        )
        return [self._record(row) for row in rows]

    async def ping(self):
        pool = await self._get_pool()
        await pool.fetchval("SELECT 1")

    async def close(self):
        if self._pool is not None:
            await self._pool.close()
            self._pool = None


class OperatorService:
    def __init__(self, store, woo):
        self.store, self.woo = store, woo

    async def patch(self, product_id, body):
        key = digest(body.idempotency_key)
        fingerprint = digest({"id": product_id, **body.model_dump()})
        previous = await self.store.find(key)
        if previous:
            if previous["fingerprint"] != fingerprint:
                raise OperatorError(409, "IDEMPOTENCY_CONFLICT")
            return previous.get("http_status") or 409, previous.get("result") or {
                "error": "OPERATION_IN_PROGRESS", "operation_id": previous["operation_id"]}
        op = str(uuid.uuid4())
        record = {"operation_id": op, "product_id": product_id,
                  "fingerprint": fingerprint, "reason": body.reason,
                  "actor": "operator", "created_at": datetime.now(timezone.utc).isoformat(),
                  "state": "pending", "before": None, "after": None}
        if not await self.store.reserve(key, record):
            return await self.patch(product_id, body)
        locked = False
        write_started = False
        resolved = False
        try:
            locked = await self.store.lock(product_id, op)
            if not locked:
                raise OperatorError(409, "PRODUCT_BUSY")
            before = await self.woo.get(product_id)
            await self.store.save(key, {"before": before})
            if before["version"] != body.expected_version:
                raise OperatorError(409, "VERSION_CONFLICT")
            # Persist intent before sending a mutation; never automatically retry writes.
            await self.store.save(key, {"state": "writing"})
            write_started = True
            await self.woo.rename(product_id, body.name)
            after = await self.woo.get(product_id)
            verified = after["id"] == product_id and after["name"] == body.name
            status = 200 if verified else 502
            result = {"operation_id": op, "verified": verified, "product": after}
            if not verified:
                result["error"] = "VERIFICATION_FAILED"
            await self.store.save(key, {"state": "verified" if verified else "unverified",
                                        "after": after, "result": result, "http_status": status})
            resolved = verified
            return status, result
        except OperatorError as exc:
            result = {"error": exc.code, "operation_id": op, "verified": False}
            await self.store.save(key, {"state": "uncertain" if write_started else "rejected",
                                        "result": result, "http_status": exc.status})
            return exc.status, result
        except Exception:
            # Audit persistence or an unexpected failure can leave a write outcome unknown.
            return 503, {"error": "OPERATION_UNCERTAIN", "operation_id": op, "verified": False}
        finally:
            if locked and (not write_started or resolved):
                await self.store.unlock(product_id, op)


def create_router(store, woo=None, printful=None):
    from printful_api import PrintfulClient

    router = APIRouter(prefix="/api/operator/v1")
    service = OperatorService(store, woo or WooClient())
    printful_client = printful or PrintfulClient()

    async def dispatch(request, action):
        try:
            token = os.getenv("OPERATOR_API_TOKEN", "")
            if len(token) < 32:
                raise OperatorError(503, "OPERATOR_NOT_CONFIGURED")
            supplied = request.headers.get("authorization", "")
            if not hmac.compare_digest(supplied.encode(), ("Bearer " + token).encode()):
                raise OperatorError(401, "UNAUTHORIZED")
            status, result = await action()
        except OperatorError as exc:
            status, result = exc.status, {"error": exc.code}
        except Exception:
            status, result = 503, {"error": "OPERATOR_UNAVAILABLE"}
        return JSONResponse(result, status_code=status, headers={"Cache-Control": "no-store"})

    def pagination(request):
        try:
            page = int(request.query_params.get("page", "1"))
            size = int(request.query_params.get("per_page", "20"))
            if not 1 <= page <= 100000 or not 1 <= size <= 100:
                raise ValueError()
            return page, size
        except ValueError:
            raise OperatorError(400, "INVALID_PAGINATION") from None

    def valid_id(value):
        if not value.isascii() or not value.isdecimal() or not 1 <= int(value) <= 2147483647:
            raise OperatorError(400, "INVALID_PRODUCT_ID")
        return int(value)

    def printful_pagination(request):
        try:
            limit = int(request.query_params.get("limit", "20"))
            offset = int(request.query_params.get("offset", "0"))
            if not 1 <= limit <= 100 or not 0 <= offset <= 1000000:
                raise ValueError()
            return limit, offset
        except ValueError:
            raise OperatorError(400, "INVALID_PAGINATION") from None

    @router.get("/status")
    async def status(request: Request):
        async def action():
            await store.ping()
            await service.woo.call("GET", "products", params={"per_page": 1})
            return 200, {"status": "ok", "audit": "ok", "woocommerce": "ok",
                         "writes_enabled": os.getenv("OPERATOR_WRITES_ENABLED") == "true"}
        return await dispatch(request, action)

    @router.get("/products")
    async def products(request: Request):
        async def action():
            page, size = pagination(request)
            raw, headers = await service.woo.call("GET", "products", params={"page": page, "per_page": size})
            total, pages = int(headers["X-WP-Total"]), int(headers["X-WP-TotalPages"])
            return 200, {"products": [product_view(p) for p in raw], "page": page,
                         "per_page": size, "total": total, "total_pages": pages,
                         "next_page": page + 1 if page < pages else None}
        return await dispatch(request, action)

    @router.get("/products/{product_id}")
    async def product(product_id: str, request: Request):
        async def action():
            return 200, await service.woo.get(valid_id(product_id))
        return await dispatch(request, action)

    @router.patch("/products/{product_id}")
    async def patch(product_id: str, request: Request):
        async def action():
            product_id_int = valid_id(product_id)
            if os.getenv("OPERATOR_WRITES_ENABLED") != "true":
                raise OperatorError(403, "WRITES_DISABLED")
            raw = b""
            async for chunk in request.stream():
                raw += chunk
                if len(raw) > 8192:
                    raise OperatorError(413, "BODY_TOO_LARGE")
            try:
                body = Rename.model_validate_json(raw)
                if any(ord(c) < 32 or c in "<>" for c in body.name):
                    raise ValueError()
            except (ValidationError, ValueError):
                raise OperatorError(400, "INVALID_PATCH") from None
            return await service.patch(product_id_int, body)
        return await dispatch(request, action)

    @router.get("/audit")
    async def audit(request: Request):
        async def action():
            page, size = pagination(request)
            return 200, {"operations": await store.audit(page, size), "page": page, "per_page": size}
        return await dispatch(request, action)

    @router.get("/printful/status")
    async def printful_status(request: Request):
        async def action():
            capabilities = {}
            errors = {}
            for name, call in (
                    ("productTemplatesRead", lambda: printful_client.templates(1, 0)),
                    ("syncProductsRead", lambda: printful_client.sync_products(1, 0))):
                try:
                    await call()
                    capabilities[name] = True
                except OperatorError as exc:
                    if exc.code == "PRINTFUL_NOT_CONFIGURED":
                        raise
                    capabilities[name] = False
                    errors[name] = exc.code
            result = {"ok": all(capabilities.values()), **capabilities}
            if errors:
                result["errors"] = errors
            return 200, result
        return await dispatch(request, action)

    @router.get("/printful/templates")
    async def printful_templates(request: Request):
        async def action():
            return 200, await printful_client.templates(*printful_pagination(request))
        return await dispatch(request, action)

    @router.get("/printful/templates/{template_id}")
    async def printful_template(template_id: str, request: Request):
        async def action():
            return 200, await printful_client.template(valid_id(template_id))
        return await dispatch(request, action)

    @router.get("/printful/sync-products")
    async def printful_sync_products(request: Request):
        async def action():
            return 200, await printful_client.sync_products(*printful_pagination(request))
        return await dispatch(request, action)

    @router.get("/printful/sync-products/{sync_product_id}")
    async def printful_sync_product(sync_product_id: str, request: Request):
        async def action():
            return 200, await printful_client.sync_product(valid_id(sync_product_id))
        return await dispatch(request, action)

    return router
