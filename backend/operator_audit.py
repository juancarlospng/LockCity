"""General, PII-minimized audit and idempotency primitives for Operator writes."""
from __future__ import annotations

import asyncio
import hashlib
import json
import re
import uuid
from datetime import datetime, timezone
from typing import Any

import asyncpg


IDEMPOTENCY_RE = re.compile(r"^[A-Za-z0-9_-]{16,128}$")
FINAL_STATES = frozenset({"verified", "failed", "uncertain"})


class AuditEventError(Exception):
    def __init__(self, status: int, code: str, record: dict[str, Any] | None = None):
        self.status = status
        self.code = code
        self.record = record
        super().__init__(code)


def canonical_hash(value: Any) -> str:
    encoded = json.dumps(
        value, sort_keys=True, ensure_ascii=True, separators=(",", ":")
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def idempotency_hash(value: str) -> str:
    if not isinstance(value, str) or not IDEMPOTENCY_RE.fullmatch(value):
        raise AuditEventError(400, "INVALID_IDEMPOTENCY_KEY")
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


class PostgresAuditEventStore:
    """Private Postgres persistence. Raw idempotency keys are never stored."""

    _UPDATABLE = {
        "state": ("state", False),
        "entity_id": ("entity_id", False),
        "before": ("before_payload", True),
        "after": ("after_payload", True),
        "result": ("result_payload", True),
        "http_status": ("http_status", False),
        "error_code": ("error_code", False),
    }

    def __init__(self, database_url: str | None):
        self.database_url = database_url or ""
        self._pool = None
        self._pool_lock = asyncio.Lock()

    async def _get_pool(self):
        if not self.database_url:
            raise AuditEventError(503, "AUDIT_NOT_CONFIGURED")
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
                        raise AuditEventError(503, "AUDIT_UNAVAILABLE") from None
        return self._pool

    @staticmethod
    def _record(row):
        if row is None:
            return None
        result = dict(row)
        for name in ("operation_id", "created_at", "updated_at"):
            if result.get(name) is not None:
                result[name] = str(result[name])
        for name in ("before", "after", "result"):
            if isinstance(result.get(name), str):
                result[name] = json.loads(result[name])
        # Internal hashes are deliberately excluded from API/audit responses.
        result.pop("idempotency_key_hash", None)
        result.pop("request_fingerprint", None)
        return result

    async def find_internal(self, key_hash: str):
        pool = await self._get_pool()
        row = await pool.fetchrow(
            """SELECT idempotency_key_hash, operation_id, request_fingerprint,
                      actor_id, action, entity_type, entity_id, state, reason,
                      before_payload AS before, after_payload AS after,
                      result_payload AS result, http_status, error_code,
                      created_at, updated_at
               FROM public.operator_audit_events
               WHERE idempotency_key_hash = $1""",
            key_hash,
        )
        if row is None:
            return None
        record = dict(row)
        public = self._record(row)
        record.update(public)
        return record

    async def reserve(self, key_hash: str, record: dict[str, Any]) -> bool:
        pool = await self._get_pool()
        row = await pool.fetchrow(
            """INSERT INTO public.operator_audit_events
                   (idempotency_key_hash, operation_id, request_fingerprint,
                    actor_id, action, entity_type, entity_id, state, reason,
                    before_payload, after_payload, result_payload,
                    http_status, error_code, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, 'reserved', $8,
                       NULL, NULL, NULL, NULL, NULL, $9, $9)
               ON CONFLICT (idempotency_key_hash) DO NOTHING
               RETURNING idempotency_key_hash""",
            key_hash,
            uuid.UUID(record["operation_id"]),
            record["request_fingerprint"],
            record["actor_id"],
            record["action"],
            record["entity_type"],
            record.get("entity_id"),
            record["reason"],
            datetime.fromisoformat(record["created_at"]),
        )
        return row is not None

    async def update(self, key_hash: str, fields: dict[str, Any]) -> None:
        unknown = set(fields) - self._UPDATABLE.keys()
        if unknown or not fields:
            raise AuditEventError(500, "INVALID_AUDIT_UPDATE")
        assignments, values = [], []
        for name, value in fields.items():
            column, is_json = self._UPDATABLE[name]
            values.append(json.dumps(value) if is_json else value)
            assignments.append(f"{column} = ${len(values)}" + ("::jsonb" if is_json else ""))
        values.extend([datetime.now(timezone.utc), key_hash])
        assignments.append(f"updated_at = ${len(values) - 1}")
        pool = await self._get_pool()
        await pool.execute(
            f"UPDATE public.operator_audit_events SET {', '.join(assignments)} "
            f"WHERE idempotency_key_hash = ${len(values)}",
            *values,
        )

    async def list(self, page: int, size: int):
        pool = await self._get_pool()
        rows = await pool.fetch(
            """SELECT operation_id, actor_id, action, entity_type, entity_id,
                      state, reason, before_payload AS before,
                      after_payload AS after, result_payload AS result,
                      http_status, error_code, created_at, updated_at
               FROM public.operator_audit_events
               ORDER BY created_at DESC
               LIMIT $1 OFFSET $2""",
            size,
            (page - 1) * size,
        )
        return [self._record(row) for row in rows]

    async def close(self):
        if self._pool is not None:
            await self._pool.close()
            self._pool = None


class AuditEvents:
    def __init__(self, store: PostgresAuditEventStore):
        self.store = store

    async def reserve(
        self,
        *,
        idempotency_key: str,
        fingerprint_payload: Any,
        actor_id: str,
        action: str,
        entity_type: str,
        entity_id: str | None,
        reason: str,
    ) -> tuple[str, str, dict[str, Any] | None]:
        key_hash = idempotency_hash(idempotency_key)
        fingerprint = canonical_hash({"action": action, "payload": fingerprint_payload})
        existing = await self.store.find_internal(key_hash)
        if existing is not None:
            if existing["request_fingerprint"] != fingerprint or existing["action"] != action:
                raise AuditEventError(409, "IDEMPOTENCY_KEY_REUSED")
            return key_hash, existing["operation_id"], existing

        operation_id = str(uuid.uuid4())
        record = {
            "operation_id": operation_id,
            "request_fingerprint": fingerprint,
            "actor_id": actor_id,
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "reason": reason,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        if await self.store.reserve(key_hash, record):
            return key_hash, operation_id, None
        # Resolve a concurrent reservation deterministically.
        existing = await self.store.find_internal(key_hash)
        if existing is None:
            raise AuditEventError(503, "AUDIT_UNAVAILABLE")
        if existing["request_fingerprint"] != fingerprint or existing["action"] != action:
            raise AuditEventError(409, "IDEMPOTENCY_KEY_REUSED")
        return key_hash, existing["operation_id"], existing

    async def mark(self, key_hash: str, state: str, **fields: Any) -> None:
        if state not in {"reserved", "writing", *FINAL_STATES}:
            raise AuditEventError(500, "INVALID_AUDIT_STATE")
        await self.store.update(key_hash, {"state": state, **fields})

    @staticmethod
    def replay(existing: dict[str, Any]) -> tuple[int, dict[str, Any]]:
        state = existing.get("state")
        if state == "verified" and isinstance(existing.get("result"), dict):
            result = dict(existing["result"])
            result["replayed"] = True
            return int(existing.get("http_status") or 200), result
        if state == "failed":
            raise AuditEventError(
                int(existing.get("http_status") or 409),
                existing.get("error_code") or "OPERATION_FAILED",
                existing,
            )
        if state == "uncertain":
            raise AuditEventError(503, "OPERATION_UNCERTAIN", existing)
        raise AuditEventError(409, "OPERATION_IN_PROGRESS", existing)
