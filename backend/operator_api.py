"""Server-only Operator API. Never return upstream errors or raw WC objects."""
import asyncio
import hashlib
import hmac
import json
import os
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from urllib.parse import urlsplit

import asyncpg
import httpx
from fastapi import APIRouter, Request
from pydantic import BaseModel, ConfigDict, Field, StrictInt, StrictStr, ValidationError
from starlette.responses import JSONResponse


class OperatorError(Exception):
    def __init__(self, status, code, details=None):
        self.status, self.code, self.details = status, code, details


class Rename(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    name: StrictStr = Field(min_length=1, max_length=200)
    reason: StrictStr = Field(min_length=1, max_length=500)
    expected_version: StrictStr = Field(pattern=r"^[a-f0-9]{64}$")
    idempotency_key: StrictStr = Field(pattern=r"^[A-Za-z0-9_-]{16,128}$")


AW26_WOO_PRODUCT_IDS = frozenset({
    3823, 3854, 3915, 3923, 3932, 3941, 3950, 3973, 3979,
    3996, 4005, 4022, 4040, 4048, 4067, 4084, 4093, 4102, 4143,
})
AW26_ACTIVE_WOO_PRODUCT_IDS = AW26_WOO_PRODUCT_IDS - {4102}
AW26_MERCHANDISING_WRITE_PRODUCT_IDS = AW26_ACTIVE_WOO_PRODUCT_IDS
AW26_CATEGORY_DEFINITIONS = (
    {"name": "Accessories", "slug": "accessories", "parent": 0},
    {"name": "AW26", "slug": "aw26", "parent": 0},
)
AW26_CATEGORY_POLICY_BY_TEMPLATE_ID = {
    106357278: "top", 106094567: "top", 105624073: "bottom",
    105623495: "top", 100892117: "hats", 107660910: "bottom",
    79403270: "top", 107660830: "top", 107658409: "top",
    107564276: "top", 107563824: "top", 107563422: "hats",
    107530836: "top", 107221423: "top", 106767107: "bottom",
    106766446: "accessories", 106357334: "hats",
}


class Aw26ProductPatch(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    name: StrictStr | None = Field(default=None, min_length=1, max_length=200)
    description: StrictStr | None = Field(default=None, max_length=50000)
    short_description: StrictStr | None = Field(default=None, max_length=10000)
    categories: list[StrictInt] | None = Field(default=None, min_length=1, max_length=20)
    menu_order: StrictInt | None = Field(default=None, ge=0, le=10000)
    retail_price: StrictStr | None = Field(
        default=None, pattern=r"^(?:0|[1-9][0-9]{0,5})(?:\.[0-9]{1,2})?$")
    reason: StrictStr = Field(min_length=1, max_length=500)
    expected_version: StrictStr = Field(pattern=r"^[a-f0-9]{64}$")
    idempotency_key: StrictStr = Field(pattern=r"^[A-Za-z0-9_-]{16,128}$")


class Aw26HardHide(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
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


def _safe_printful_metadata(items):
    safe = []
    forbidden = ("secret", "token", "password", "authorization", "consumer_key")
    for item in items if isinstance(items, list) else []:
        if not isinstance(item, dict):
            continue
        key = item.get("key")
        value = item.get("value")
        if (not isinstance(key, str) or "printful" not in key.lower()
                or any(word in key.lower() for word in forbidden)
                or not isinstance(value, (str, int, float, bool))
                or isinstance(value, str) and len(value) > 200):
            continue
        safe.append({"key": key, "value": value})
    return safe


def _attributes(items):
    result = []
    for item in items if isinstance(items, list) else []:
        if not isinstance(item, dict):
            continue
        name = item.get("name") if isinstance(item.get("name"), str) else ""
        option = item.get("option") if isinstance(item.get("option"), str) else ""
        if name:
            result.append({"name": name, "option": option})
    return result


def variation_view(raw):
    if not isinstance(raw, dict) or not isinstance(raw.get("id"), int):
        raise OperatorError(502, "INVALID_UPSTREAM_RESPONSE")
    attributes = _attributes(raw.get("attributes"))
    named = {item["name"].strip().lower(): item["option"] for item in attributes}
    return {
        "id": raw["id"],
        "status": raw.get("status", ""),
        "color": next((value for name, value in named.items() if "color" in name or "colour" in name), None),
        "size": next((value for name, value in named.items() if "size" in name or "talla" in name), None),
        "attributes": attributes,
        "regular_price": raw.get("regular_price", ""),
        "sale_price": raw.get("sale_price", ""),
        "stock_status": raw.get("stock_status", ""),
        "stock_quantity": raw.get("stock_quantity"),
        "manage_stock": bool(raw.get("manage_stock")),
        "sku": raw.get("sku", ""),
        "printful": _safe_printful_metadata(raw.get("meta_data")),
    }


def _canonical_price(value):
    if value in (None, ""):
        return ""
    try:
        return format(Decimal(str(value)).quantize(Decimal("0.01")), "f")
    except Exception:
        return str(value)


def aw26_commercial_state(raw, variations):
    """Return only stable commercial fields used for optimistic concurrency."""
    parent_attributes = []
    for item in raw.get("attributes", []) if isinstance(raw.get("attributes"), list) else []:
        if not isinstance(item, dict) or not isinstance(item.get("name"), str):
            continue
        options = item.get("options") if isinstance(item.get("options"), list) else []
        parent_attributes.append({
            "name": item["name"],
            "options": sorted(str(option) for option in options),
            "variation": bool(item.get("variation")),
        })
    parent_attributes.sort(key=lambda item: (item["name"].casefold(), item["name"]))

    stable_variations = []
    for item in variations:
        if not isinstance(item, dict) or not isinstance(item.get("id"), int):
            raise OperatorError(502, "INVALID_UPSTREAM_RESPONSE")
        attributes = _attributes(item.get("attributes"))
        attributes.sort(key=lambda value: (value["name"].casefold(), value["name"], value["option"]))
        stable_variations.append({
            "id": item["id"],
            "regular_price": _canonical_price(item.get("regular_price")),
            "sale_price": _canonical_price(item.get("sale_price")),
            "status": item.get("status", ""),
            "sku": item.get("sku", ""),
            "stock_status": item.get("stock_status", ""),
            "stock_quantity": item.get("stock_quantity"),
            "manage_stock": bool(item.get("manage_stock")),
            "attributes": attributes,
        })
    stable_variations.sort(key=lambda item: item["id"])

    category_ids = sorted(item["id"] for item in raw.get("categories", [])
                          if isinstance(item, dict) and isinstance(item.get("id"), int))
    image_ids = [item["id"] for item in raw.get("images", [])
                 if isinstance(item, dict) and isinstance(item.get("id"), int)]
    return {
        "id": raw.get("id"),
        "name": raw.get("name", ""),
        "status": raw.get("status", ""),
        "type": raw.get("type", ""),
        "catalog_visibility": raw.get("catalog_visibility", ""),
        "description": raw.get("description", ""),
        "short_description": raw.get("short_description", ""),
        "category_ids": category_ids,
        "attributes": parent_attributes,
        "image_ids": image_ids,
        "menu_order": raw.get("menu_order", 0),
        "regular_price": _canonical_price(raw.get("regular_price")),
        "sale_price": _canonical_price(raw.get("sale_price")),
        "sku": raw.get("sku", ""),
        "stock_status": raw.get("stock_status", ""),
        "stock_quantity": raw.get("stock_quantity"),
        "manage_stock": bool(raw.get("manage_stock")),
        "variations": stable_variations,
    }


def aw26_commercial_version(raw, variations):
    return digest(aw26_commercial_state(raw, variations))


def aw26_product_view(raw, variations):
    if not isinstance(raw, dict) or not isinstance(raw.get("id"), int):
        raise OperatorError(502, "INVALID_UPSTREAM_RESPONSE")
    variation_views = [variation_view(item) for item in variations]
    variation_ids = raw.get("variations")
    if not isinstance(variation_ids, list) or any(not isinstance(item, int) for item in variation_ids):
        raise OperatorError(502, "INVALID_UPSTREAM_RESPONSE")
    if set(variation_ids) != {item["id"] for item in variation_views}:
        raise OperatorError(502, "INVALID_UPSTREAM_RESPONSE")
    categories = [{"id": item.get("id"), "name": item.get("name", ""), "slug": item.get("slug", "")}
                  for item in raw.get("categories", []) if isinstance(item, dict)
                  and isinstance(item.get("id"), int)]
    images = [{"id": item.get("id"), "src": item.get("src", ""), "alt": item.get("alt", "")}
              for item in raw.get("images", []) if isinstance(item, dict)
              and isinstance(item.get("id"), int)]
    attributes = []
    for item in raw.get("attributes", []) if isinstance(raw.get("attributes"), list) else []:
        if isinstance(item, dict) and isinstance(item.get("name"), str):
            options = item.get("options") if isinstance(item.get("options"), list) else []
            attributes.append({"id": item.get("id"), "name": item["name"],
                               "options": [str(option) for option in options],
                               "variation": bool(item.get("variation"))})
    return {
        "id": raw["id"], "name": raw.get("name", ""), "slug": raw.get("slug", ""),
        "status": raw.get("status", ""), "type": raw.get("type", ""),
        "catalog_visibility": raw.get("catalog_visibility", ""),
        "description": raw.get("description", ""),
        "short_description": raw.get("short_description", ""),
        "menu_order": raw.get("menu_order", 0), "categories": categories,
        "regular_price": _canonical_price(raw.get("regular_price")),
        "sale_price": _canonical_price(raw.get("sale_price")),
        "sku": raw.get("sku", ""),
        "stock_status": raw.get("stock_status", ""),
        "stock_quantity": raw.get("stock_quantity"),
        "manage_stock": bool(raw.get("manage_stock")),
        "images": images, "attributes": attributes, "variation_ids": variation_ids,
        "variations": variation_views, "printful": _safe_printful_metadata(raw.get("meta_data")),
        "version": aw26_commercial_version(raw, variations),
    }


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

    async def get_aw26(self, product_id):
        raw, _ = await self.call("GET", f"products/{product_id}", params={"context": "edit"})
        variations = []
        page = 1
        while True:
            batch, headers = await self.call(
                "GET", f"products/{product_id}/variations",
                params={"context": "edit", "page": page, "per_page": 100})
            if not isinstance(batch, list):
                raise OperatorError(502, "INVALID_UPSTREAM_RESPONSE")
            variations.extend(batch)
            try:
                total_pages = int(headers.get("X-WP-TotalPages", "1"))
            except (TypeError, ValueError):
                raise OperatorError(502, "INVALID_UPSTREAM_RESPONSE") from None
            if page >= total_pages:
                break
            page += 1
        view = aw26_product_view(raw, variations)
        if view["id"] != product_id:
            raise OperatorError(502, "INVALID_UPSTREAM_RESPONSE")
        return view

    async def get_aw26_catalog(self, product_ids):
        """Read hidden AW26 parents once and fetch variations with bounded concurrency."""
        ids = tuple(product_ids)
        raw_products, _ = await self.call("GET", "products", params={
            "context": "edit", "include": ",".join(str(item) for item in ids),
            "orderby": "include", "per_page": 100,
        })
        if not isinstance(raw_products, list):
            raise OperatorError(502, "INVALID_UPSTREAM_RESPONSE")
        by_id = {item.get("id"): item for item in raw_products if isinstance(item, dict)}
        if len(by_id) != len(ids) or any(item not in by_id for item in ids):
            raise OperatorError(502, "INCOMPLETE_AW26_CATALOG")
        semaphore = asyncio.Semaphore(4)

        async def read_product(product_id):
            async with semaphore:
                variations, page = [], 1
                while True:
                    batch, headers = await self.call(
                        "GET", f"products/{product_id}/variations",
                        params={"context": "edit", "page": page, "per_page": 100})
                    if not isinstance(batch, list):
                        raise OperatorError(502, "INVALID_UPSTREAM_RESPONSE")
                    variations.extend(batch)
                    try:
                        total_pages = int(headers.get("X-WP-TotalPages", "1"))
                    except (TypeError, ValueError):
                        raise OperatorError(502, "INVALID_UPSTREAM_RESPONSE") from None
                    if page >= total_pages:
                        break
                    page += 1
                return aw26_product_view(by_id[product_id], variations)

        return await asyncio.gather(*(read_product(product_id) for product_id in ids))

    async def update_aw26(
            self, product_id, fields, variation_ids, retail_price=None,
            product_type=None):
        fields = dict(fields)
        if retail_price is not None and product_type == "simple":
            if variation_ids:
                raise OperatorError(409, "VARIATION_SET_UNSAFE")
            fields["regular_price"] = retail_price
        if fields:
            await self.call("PUT", f"products/{product_id}", payload=fields)
        if retail_price is not None and product_type == "variable":
            if not variation_ids or len(variation_ids) > 100:
                raise OperatorError(409, "VARIATION_SET_UNSAFE")
            await self.call("POST", f"products/{product_id}/variations/batch", payload={
                "update": [{"id": variation_id, "regular_price": retail_price}
                           for variation_id in variation_ids]
            })


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

    async def reconcile_uncertain_lock(self, product_id, expected_version):
        """Release only an old uncertain lock whose resource is demonstrably unchanged."""
        pool = await self._get_pool()
        row = await pool.fetchrow(
            """DELETE FROM public.operator_locks AS locks
               USING public.operator_audit AS audit
               WHERE locks.product_id = $1
                 AND locks.operation_id = audit.operation_id
                 AND audit.product_id = $1
                 AND audit.state = 'uncertain'
                 AND (audit.after_payload IS NULL OR audit.after_payload = 'null'::jsonb)
                 AND audit.before_payload->>'version' = $2
                 AND locks.acquired_at < now() - interval '5 minutes'
               RETURNING locks.operation_id""",
            product_id,
            expected_version,
        )
        return row is not None

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

    async def create_mockup_plan(self, plan):
        plan_id = uuid.uuid4()
        now = datetime.now(timezone.utc)
        pool = await self._get_pool()
        async with pool.acquire() as connection:
            async with connection.transaction():
                await connection.execute(
                    """INSERT INTO public.operator_mockup_plans
                           (plan_id, template_id, product_payload, requested_variants,
                            requested_styles, status, created_at, updated_at)
                       VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb,
                               'planned', $6, $6)""",
                    plan_id,
                    plan["templateId"],
                    json.dumps(plan["product"]),
                    json.dumps(plan["selectedRepresentativeVariants"]),
                    json.dumps(plan["requestedStyles"]),
                    now,
                )
                await connection.execute(
                    """INSERT INTO public.operator_mockup_audit
                           (plan_id, template_id, action, status, created_at)
                       VALUES ($1, $2, 'dry_run', 'planned', $3)""",
                    plan_id, plan["templateId"], now,
                )
        return str(plan_id)

    async def claim_mockup_plan(self, plan_id, template_id):
        pool = await self._get_pool()
        now = datetime.now(timezone.utc)
        async with pool.acquire() as connection:
            async with connection.transaction():
                row = await connection.fetchrow(
                    """UPDATE public.operator_mockup_plans
                       SET status = 'scheduling', updated_at = $3
                       WHERE plan_id = $1 AND template_id = $2 AND status = 'planned'
                       RETURNING product_payload AS product,
                                 requested_variants AS variants,
                                 requested_styles AS styles""",
                    uuid.UUID(plan_id), template_id, now,
                )
                if row is None:
                    return None
                await connection.execute(
                    """INSERT INTO public.operator_mockup_audit
                           (plan_id, template_id, action, status, created_at)
                       VALUES ($1, $2, 'generation', 'scheduling', $3)""",
                    uuid.UUID(plan_id), template_id, now,
                )
        result = dict(row)
        for key in ("product", "variants", "styles"):
            if isinstance(result.get(key), str):
                result[key] = json.loads(result[key])
        return result

    async def complete_mockup_plan(self, plan_id, template_id, task_keys):
        pool = await self._get_pool()
        now = datetime.now(timezone.utc)
        async with pool.acquire() as connection:
            async with connection.transaction():
                await connection.execute(
                    """UPDATE public.operator_mockup_plans
                       SET status = 'pending', task_keys = $2::jsonb, updated_at = $3
                       WHERE plan_id = $1 AND status = 'scheduling'""",
                    uuid.UUID(plan_id), json.dumps(task_keys), now,
                )
                for task_key in task_keys:
                    await connection.execute(
                        """INSERT INTO public.operator_mockup_audit
                               (plan_id, template_id, action, task_key, status, created_at)
                           VALUES ($1, $2, 'generation', $3, 'pending', $4)""",
                        uuid.UUID(plan_id), template_id, task_key, now,
                    )

    async def fail_mockup_plan(self, plan_id, template_id):
        pool = await self._get_pool()
        now = datetime.now(timezone.utc)
        async with pool.acquire() as connection:
            async with connection.transaction():
                await connection.execute(
                    """UPDATE public.operator_mockup_plans
                       SET status = 'failed', updated_at = $2 WHERE plan_id = $1""",
                    uuid.UUID(plan_id), now,
                )
                await connection.execute(
                    """INSERT INTO public.operator_mockup_audit
                           (plan_id, template_id, action, status, created_at)
                       VALUES ($1, $2, 'generation', 'failed', $3)""",
                    uuid.UUID(plan_id), template_id, now,
                )

    async def mockup_task_context(self, task_key):
        pool = await self._get_pool()
        row = await pool.fetchrow(
            """SELECT plan_id, template_id, product_payload AS product,
                      requested_variants AS variants, requested_styles AS styles
               FROM public.operator_mockup_plans
               WHERE task_keys @> $1::jsonb""",
            json.dumps([task_key]),
        )
        if row is None:
            return None
        result = dict(row)
        result["plan_id"] = str(result["plan_id"])
        for key in ("product", "variants", "styles"):
            if isinstance(result.get(key), str):
                result[key] = json.loads(result[key])
        return result

    async def record_mockup_task_status(self, context, task_key, status):
        pool = await self._get_pool()
        await pool.execute(
            """INSERT INTO public.operator_mockup_audit
                   (plan_id, template_id, action, task_key, status, created_at)
               VALUES ($1, $2, 'status_check', $3, $4, $5)""",
            uuid.UUID(context["plan_id"]), context["template_id"], task_key,
            status, datetime.now(timezone.utc),
        )

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


class Aw26ProductService:
    EDITABLE_FIELDS = ("name", "description", "short_description", "categories", "menu_order")

    def __init__(self, store, woo):
        self.store, self.woo = store, woo

    async def categories(self):
        items, page = [], 1
        while True:
            batch, headers = await self.woo.call(
                "GET", "products/categories",
                params={"page": page, "per_page": 100, "hide_empty": "false"})
            if not isinstance(batch, list):
                raise OperatorError(502, "INVALID_UPSTREAM_RESPONSE")
            items.extend(batch)
            try:
                total_pages = int(headers.get("X-WP-TotalPages", "1"))
            except (TypeError, ValueError):
                raise OperatorError(502, "INVALID_UPSTREAM_RESPONSE") from None
            if page >= total_pages:
                break
            page += 1
        names = {item.get("id"): item.get("name", "") for item in items
                 if isinstance(item, dict) and isinstance(item.get("id"), int)}
        return [{"id": item["id"], "name": item.get("name", ""),
                 "slug": item.get("slug", ""), "parent": item.get("parent", 0),
                 "parent_name": names.get(item.get("parent"), "")}
                for item in items if isinstance(item, dict) and isinstance(item.get("id"), int)]

    async def ensure_categories(self):
        categories = await self.categories()
        result = []
        for expected in AW26_CATEGORY_DEFINITIONS:
            candidates = [item for item in categories if (
                item["slug"].casefold() == expected["slug"].casefold()
                or item["name"].casefold() == expected["name"].casefold())]
            exact = [item for item in candidates if item["parent"] == 0]
            if len(exact) > 1 or candidates and not exact:
                raise OperatorError(409, "CATEGORY_CONFLICT")
            if exact:
                item = exact[0]
                result.append({**item, "created": False})
                continue
            raw, _ = await self.woo.call(
                "POST", "products/categories", payload=expected)
            if (not isinstance(raw, dict) or not isinstance(raw.get("id"), int)
                    or raw.get("parent", 0) != 0):
                raise OperatorError(502, "INVALID_UPSTREAM_RESPONSE")
            item = {"id": raw["id"], "name": raw.get("name", ""),
                    "slug": raw.get("slug", ""), "parent": raw.get("parent", 0),
                    "parent_name": "", "created": True}
            categories.append(item)
            result.append(item)
        return result

    @staticmethod
    def _write_fields(body):
        fields = {name: getattr(body, name) for name in Aw26ProductService.EDITABLE_FIELDS
                  if getattr(body, name) is not None}
        if "categories" in fields:
            fields["categories"] = [{"id": category_id} for category_id in fields["categories"]]
        return fields

    @staticmethod
    def _price(value):
        if value is None:
            return None
        try:
            return format(Decimal(value).quantize(Decimal("0.01")), "f")
        except Exception:
            return None

    @staticmethod
    def _verified(before, after, body):
        if (after["id"] != before["id"] or after["status"] != "draft"
                or after["type"] != before["type"]
                or after["catalog_visibility"] != "hidden"
                or after["variation_ids"] != before["variation_ids"]):
            return False
        for field in ("name", "description", "short_description", "menu_order"):
            expected = getattr(body, field)
            if expected is not None and after[field] != expected:
                return False
            if expected is None and after[field] != before[field]:
                return False
        if body.categories is not None:
            if ({item["id"] for item in after["categories"]} != set(body.categories)
                    or len(after["categories"]) != len(body.categories)):
                return False
        elif after["categories"] != before["categories"]:
            return False
        if ([item["id"] for item in after["images"]]
                != [item["id"] for item in before["images"]]):
            return False
        for field in (
                "slug", "attributes", "printful", "sale_price", "sku",
                "stock_status", "stock_quantity", "manage_stock"):
            if after[field] != before[field]:
                return False
        expected_price = Aw26ProductService._price(body.retail_price)
        if before["type"] == "simple":
            if after["variations"] or before["variations"]:
                return False
            if expected_price is not None and Aw26ProductService._price(
                    after["regular_price"]) != expected_price:
                return False
            if expected_price is None and after["regular_price"] != before["regular_price"]:
                return False
        elif before["type"] != "variable":
            return False
        elif after["regular_price"] != before["regular_price"]:
            return False
        before_variations = {item["id"]: item for item in before["variations"]}
        after_variations = {item["id"]: item for item in after["variations"]}
        if before_variations.keys() != after_variations.keys():
            return False
        for variation_id, old in before_variations.items():
            current = after_variations[variation_id]
            if any(current[field] != old[field] for field in (
                    "sku", "stock_status", "stock_quantity", "manage_stock", "status",
                    "sale_price", "attributes", "printful")):
                return False
            if before["type"] == "variable":
                if (expected_price is None
                        and current["regular_price"] != old["regular_price"]):
                    return False
                if (expected_price is not None and Aw26ProductService._price(
                        current["regular_price"]) != expected_price):
                    return False
        return True

    async def patch(self, product_id, body):
        key = digest(body.idempotency_key)
        fingerprint = digest({"route": "aw26", "id": product_id, **body.model_dump()})
        previous = await self.store.find(key)
        if previous:
            if previous["fingerprint"] != fingerprint:
                raise OperatorError(409, "IDEMPOTENCY_CONFLICT")
            return previous.get("http_status") or 409, previous.get("result") or {
                "error": "OPERATION_IN_PROGRESS", "operation_id": previous["operation_id"]}
        op = str(uuid.uuid4())
        record = {
            "operation_id": op, "product_id": product_id, "fingerprint": fingerprint,
            "reason": body.reason, "actor": "operator-aw26",
            "created_at": datetime.now(timezone.utc).isoformat(), "state": "pending",
            "before": None, "after": None,
        }
        if not await self.store.reserve(key, record):
            return await self.patch(product_id, body)
        locked = False
        write_started = False
        resolved = False
        try:
            locked = await self.store.lock(product_id, op)
            if not locked:
                current = await self.woo.get_aw26(product_id)
                if (current["version"] == body.expected_version
                        and await self.store.reconcile_uncertain_lock(
                            product_id, body.expected_version)):
                    locked = await self.store.lock(product_id, op)
                if not locked:
                    raise OperatorError(409, "PRODUCT_BUSY")
            before = await self.woo.get_aw26(product_id)
            await self.store.save(key, {"before": before})
            if before["version"] != body.expected_version:
                raise OperatorError(409, "VERSION_CONFLICT")
            if before["type"] not in {"simple", "variable"}:
                raise OperatorError(409, "PRODUCT_TYPE_UNSUPPORTED")
            if (before["status"] != "draft"
                    or before["catalog_visibility"] != "hidden"):
                raise OperatorError(409, "PRODUCT_NOT_HARD_HIDDEN")
            await self.store.save(key, {"state": "writing"})
            write_started = True
            await self.woo.update_aw26(
                product_id, self._write_fields(body), before["variation_ids"],
                self._price(body.retail_price), before["type"])
            after = await self.woo.get_aw26(product_id)
            verified = self._verified(before, after, body)
            status = 200 if verified else 502
            result = {"operation_id": op, "verified": verified, "product": after}
            if not verified:
                result["error"] = "VERIFICATION_FAILED"
            await self.store.save(key, {
                "state": "verified" if verified else "unverified", "after": after,
                "result": result, "http_status": status,
            })
            resolved = verified
            return status, result
        except OperatorError as exc:
            result = {"error": exc.code, "operation_id": op, "verified": False}
            await self.store.save(key, {
                "state": "uncertain" if write_started else "rejected",
                "result": result, "http_status": exc.status,
            })
            return exc.status, result
        except Exception:
            return 503, {"error": "OPERATION_UNCERTAIN", "operation_id": op, "verified": False}
        finally:
            if locked and (not write_started or resolved):
                await self.store.unlock(product_id, op)

    async def hard_hide(self, product_id, body):
        key = digest(body.idempotency_key)
        fingerprint = digest({"route": "aw26-hard-hide", "id": product_id, **body.model_dump()})
        previous = await self.store.find(key)
        if previous:
            if previous["fingerprint"] != fingerprint:
                raise OperatorError(409, "IDEMPOTENCY_CONFLICT")
            return previous.get("http_status") or 409, previous.get("result") or {
                "error": "OPERATION_IN_PROGRESS", "operation_id": previous["operation_id"]}
        op = str(uuid.uuid4())
        record = {
            "operation_id": op, "product_id": product_id, "fingerprint": fingerprint,
            "reason": body.reason, "actor": "operator-aw26-hard-hide",
            "created_at": datetime.now(timezone.utc).isoformat(), "state": "pending",
            "before": None, "after": None,
        }
        if not await self.store.reserve(key, record):
            return await self.hard_hide(product_id, body)
        locked = False
        write_started = False
        resolved = False
        try:
            locked = await self.store.lock(product_id, op)
            if not locked:
                current = await self.woo.get_aw26(product_id)
                if (current["version"] == body.expected_version
                        and await self.store.reconcile_uncertain_lock(
                            product_id, body.expected_version)):
                    locked = await self.store.lock(product_id, op)
                if not locked:
                    raise OperatorError(409, "PRODUCT_BUSY")
            before = await self.woo.get_aw26(product_id)
            await self.store.save(key, {"before": before})
            if before["version"] != body.expected_version:
                raise OperatorError(409, "VERSION_CONFLICT")
            if before["status"] != "draft" or before["catalog_visibility"] != "hidden":
                await self.store.save(key, {"state": "writing"})
                write_started = True
                await self.woo.update_aw26(
                    product_id, {"status": "draft", "catalog_visibility": "hidden"},
                    before["variation_ids"])
            after = await self.woo.get_aw26(product_id)
            expected = {key: value for key, value in before.items() if key != "version"}
            expected.update({"status": "draft", "catalog_visibility": "hidden"})
            observed = {key: value for key, value in after.items() if key != "version"}
            verified = observed == expected
            status = 200 if verified else 502
            result = {"operation_id": op, "verified": verified, "product": after}
            if not verified:
                result["error"] = "VERIFICATION_FAILED"
            await self.store.save(key, {
                "state": "verified" if verified else "unverified", "after": after,
                "result": result, "http_status": status,
            })
            resolved = verified
            return status, result
        except OperatorError as exc:
            result = {"error": exc.code, "operation_id": op, "verified": False}
            await self.store.save(key, {
                "state": "uncertain" if write_started else "rejected",
                "result": result, "http_status": exc.status,
            })
            return exc.status, result
        except Exception:
            return 503, {"error": "OPERATION_UNCERTAIN", "operation_id": op, "verified": False}
        finally:
            if locked and (not write_started or resolved):
                await self.store.unlock(product_id, op)


def create_router(store, woo=None, printful=None):
    from printful_api import (AW26_EDITORIAL_RECOMMENDATIONS, AW26_TEMPLATE_IDS,
                              PrintfulClient, normalize_mockup_task_result,
                              plan_mockup_batches)

    router = APIRouter(prefix="/api/operator/v1")
    service = OperatorService(store, woo or WooClient())
    aw26_service = Aw26ProductService(store, service.woo)
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
            if exc.details is not None:
                result["details"] = exc.details
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

    def valid_aw26_template(value):
        template_id = valid_id(value)
        if template_id not in AW26_TEMPLATE_IDS:
            raise OperatorError(403, "TEMPLATE_NOT_ALLOWED")
        return template_id

    def valid_aw26_product(value):
        product_id = valid_id(value)
        if product_id not in AW26_WOO_PRODUCT_IDS:
            raise OperatorError(403, "AW26_PRODUCT_NOT_ALLOWED")
        return product_id

    def valid_plan_id(value):
        try:
            parsed = uuid.UUID(value)
        except (ValueError, TypeError, AttributeError):
            raise OperatorError(400, "INVALID_MOCKUP_PLAN") from None
        if str(parsed) != value.lower():
            raise OperatorError(400, "INVALID_MOCKUP_PLAN")
        return str(parsed)

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
                         "writes_enabled": os.getenv("OPERATOR_WRITES_ENABLED") == "true",
                         "aw26_product_writes_enabled":
                             os.getenv("AW26_PRODUCT_WRITE_ENABLED") == "true",
                         "aw26_publish_enabled": os.getenv("AW26_PUBLISH_ENABLED") == "true"}
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

    @router.get("/aw26/products")
    async def aw26_products(request: Request):
        async def action():
            products = await aw26_service.woo.get_aw26_catalog(
                sorted(AW26_ACTIVE_WOO_PRODUCT_IDS))
            return 200, {"products": products}
        return await dispatch(request, action)

    @router.get("/aw26/products/{product_id}")
    async def aw26_product(product_id: str, request: Request):
        async def action():
            return 200, await aw26_service.woo.get_aw26(valid_aw26_product(product_id))
        return await dispatch(request, action)

    @router.get("/aw26/categories")
    async def aw26_categories(request: Request):
        async def action():
            return 200, {"categories": await aw26_service.categories()}
        return await dispatch(request, action)

    @router.post("/aw26/categories/bootstrap")
    async def aw26_category_bootstrap(request: Request):
        async def action():
            if os.getenv("AW26_PRODUCT_WRITE_ENABLED") != "true":
                raise OperatorError(403, "AW26_PRODUCT_WRITES_DISABLED")
            if os.getenv("AW26_PUBLISH_ENABLED") == "true":
                raise OperatorError(503, "AW26_PUBLISH_CONFIGURATION_UNSAFE")
            return 200, {"categories": await aw26_service.ensure_categories()}
        return await dispatch(request, action)

    @router.patch("/aw26/products/{product_id}")
    async def patch_aw26_product(product_id: str, request: Request):
        async def action():
            product_id_int = valid_aw26_product(product_id)
            if product_id_int not in AW26_MERCHANDISING_WRITE_PRODUCT_IDS:
                raise OperatorError(403, "AW26_MERCHANDISING_WRITE_NOT_ALLOWED")
            if os.getenv("AW26_PRODUCT_WRITE_ENABLED") != "true":
                raise OperatorError(403, "AW26_PRODUCT_WRITES_DISABLED")
            if os.getenv("AW26_PUBLISH_ENABLED") == "true":
                raise OperatorError(503, "AW26_PUBLISH_CONFIGURATION_UNSAFE")
            raw = await request.body()
            if len(raw) > 65536:
                raise OperatorError(413, "BODY_TOO_LARGE")
            try:
                body = Aw26ProductPatch.model_validate_json(raw)
                editable = [*Aw26ProductService.EDITABLE_FIELDS, "retail_price"]
                if not any(getattr(body, field) is not None for field in editable):
                    raise ValueError()
                if body.categories is not None and (
                        len(set(body.categories)) != len(body.categories)
                        or any(category_id < 1 for category_id in body.categories)):
                    raise ValueError()
                if body.name is not None and any(ord(char) < 32 or char in "<>" for char in body.name):
                    raise ValueError()
                for value in (body.description, body.short_description):
                    lowered = (value or "").lower()
                    if "\x00" in lowered or "<script" in lowered or "javascript:" in lowered:
                        raise ValueError()
            except (ValidationError, ValueError):
                raise OperatorError(400, "INVALID_AW26_PATCH") from None
            return await aw26_service.patch(product_id_int, body)
        return await dispatch(request, action)

    @router.patch("/aw26/products/{product_id}/hard-hide")
    async def hard_hide_aw26_product(product_id: str, request: Request):
        async def action():
            product_id_int = valid_aw26_product(product_id)
            if os.getenv("AW26_PRODUCT_WRITE_ENABLED") != "true":
                raise OperatorError(403, "AW26_PRODUCT_WRITES_DISABLED")
            if os.getenv("AW26_PUBLISH_ENABLED") == "true":
                raise OperatorError(503, "AW26_PUBLISH_CONFIGURATION_UNSAFE")
            raw = await request.body()
            if len(raw) > 8192:
                raise OperatorError(413, "BODY_TOO_LARGE")
            try:
                body = Aw26HardHide.model_validate_json(raw)
            except ValidationError:
                raise OperatorError(400, "INVALID_AW26_HARD_HIDE") from None
            return await aw26_service.hard_hide(product_id_int, body)
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

    @router.get("/printful/templates/{template_id}/mockup-styles")
    async def printful_mockup_styles(template_id: str, request: Request):
        async def action():
            return 200, await printful_client.mockup_styles(valid_id(template_id))
        return await dispatch(request, action)

    @router.post("/printful/templates/{template_id}/mockup-tasks/dry-run")
    async def dry_run_printful_mockup_task(template_id: str, request: Request):
        async def action():
            raw = await request.body()
            if len(raw) > 2048:
                raise OperatorError(413, "BODY_TOO_LARGE")
            variant_ids = style_ids = None
            if raw:
                try:
                    body = json.loads(raw)
                    if not isinstance(body, dict) or set(body) != {"variantIds", "styleIds"}:
                        raise ValueError()
                    variant_ids, style_ids = body["variantIds"], body["styleIds"]
                    if (not isinstance(variant_ids, list) or not isinstance(style_ids, list)
                            or not 1 <= len(variant_ids) <= 20 or not 1 <= len(style_ids) <= 50
                            or any(not isinstance(item, int) or isinstance(item, bool) or item < 1
                                   for item in variant_ids + style_ids)
                            or len(set(variant_ids)) != len(variant_ids)
                            or len(set(style_ids)) != len(style_ids)):
                        raise ValueError()
                except (ValueError, TypeError, json.JSONDecodeError):
                    raise OperatorError(400, "INVALID_MOCKUP_SELECTION") from None
            plan = await printful_client.mockup_plan(
                valid_aw26_template(template_id), variant_ids, style_ids)
            plan["planId"] = await store.create_mockup_plan(plan)
            return 200, plan
        return await dispatch(request, action)

    @router.post("/printful/templates/{template_id}/mockup-tasks")
    async def create_printful_mockup_task(template_id: str, request: Request):
        async def action():
            if os.getenv("PRINTFUL_MOCKUP_GENERATION_ENABLED") != "true":
                raise OperatorError(403, "MOCKUP_GENERATION_DISABLED")
            template_id_int = valid_aw26_template(template_id)
            raw = await request.body()
            if len(raw) > 2048:
                raise OperatorError(413, "BODY_TOO_LARGE")
            try:
                body = json.loads(raw)
                if not isinstance(body, dict) or set(body) != {"planId"}:
                    raise ValueError()
                plan_id = valid_plan_id(body["planId"])
            except (ValueError, TypeError):
                raise OperatorError(400, "INVALID_MOCKUP_REQUEST") from None
            plan = await store.claim_mockup_plan(plan_id, template_id_int)
            if plan is None:
                raise OperatorError(409, "MOCKUP_PLAN_NOT_AVAILABLE")
            batches = plan_mockup_batches(plan["variants"], plan["styles"])
            if not batches:
                raise OperatorError(409, "MOCKUP_PLAN_NOT_AVAILABLE")
            try:
                task_ids = []
                for batch in batches:
                    result = await printful_client.create_mockup_task(
                        template_id_int, batch["variantIds"], batch["styleIds"])
                    task_ids.extend(result["taskIds"])
                await store.complete_mockup_plan(plan_id, template_id_int, task_ids)
            except Exception:
                await store.fail_mockup_plan(plan_id, template_id_int)
                raise
            return 200, {
                "templateId": template_id_int,
                "planId": plan_id,
                "taskKeys": task_ids,
                "status": "pending",
                "requestedVariants": plan["variants"],
                "requestedStyles": plan["styles"],
            }
        return await dispatch(request, action)

    @router.get("/printful/mockup-tasks/{task_id}")
    async def printful_mockup_task(task_id: str, request: Request):
        async def action():
            task_id_int = valid_id(task_id)
            context = await store.mockup_task_context(task_id_int)
            if context is None:
                raise OperatorError(404, "MOCKUP_TASK_NOT_FOUND")
            raw_result = await printful_client.mockup_task(task_id_int)
            capabilities = await printful_client.mockup_styles(context["template_id"])
            result = normalize_mockup_task_result(
                raw_result, task_id_int, context, capabilities["styles"])
            await store.record_mockup_task_status(context, task_id_int, result["status"])
            return 200, {
                **result,
                "planId": context["plan_id"],
                "templateId": context["template_id"],
                "product": context["product"],
                "requestedVariants": context["variants"],
                "requestedStyles": context["styles"],
                "editorialRecommendation": AW26_EDITORIAL_RECOMMENDATIONS.get(
                    context["template_id"]),
            }
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
