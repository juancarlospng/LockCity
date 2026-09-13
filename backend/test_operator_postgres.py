import asyncio
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from operator_api import PostgresStore


class FakePool:
    def __init__(self):
        self.calls = []
        self.row = None
        self.rows = []
        self.closed = False

    async def fetchrow(self, query, *args):
        self.calls.append(("fetchrow", query, args))
        return self.row

    async def fetch(self, query, *args):
        self.calls.append(("fetch", query, args))
        return self.rows

    async def execute(self, query, *args):
        self.calls.append(("execute", query, args))

    async def fetchval(self, query, *args):
        self.calls.append(("fetchval", query, args))
        return 1

    async def close(self):
        self.closed = True


def make_store():
    store = PostgresStore("postgresql://server-side-only")
    pool = FakePool()
    store._pool = pool
    return store, pool


def test_postgres_store_reserves_idempotency_key_once():
    store, pool = make_store()
    pool.row = {"idempotency_key_hash": "a" * 64}
    operation_id = str(uuid.uuid4())
    record = {
        "operation_id": operation_id,
        "product_id": 3704,
        "fingerprint": "b" * 64,
        "reason": "Test only",
        "actor": "operator",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "state": "pending",
        "before": None,
        "after": None,
    }
    assert asyncio.run(store.reserve("a" * 64, record)) is True
    _, query, args = pool.calls[0]
    assert "ON CONFLICT (idempotency_key_hash) DO NOTHING" in query
    assert args[0] == "a" * 64
    assert args[1] == uuid.UUID(operation_id)


def test_postgres_store_reads_json_audit_without_fingerprint():
    store, pool = make_store()
    operation_id = uuid.uuid4()
    created_at = datetime.now(timezone.utc)
    pool.rows = [{
        "operation_id": operation_id,
        "product_id": 3704,
        "reason": "Test only",
        "actor": "operator",
        "created_at": created_at,
        "state": "verified",
        "before": json.dumps({"name": "Old"}),
        "after": {"name": "New"},
        "result": None,
        "http_status": 200,
    }]
    result = asyncio.run(store.audit(1, 20))
    assert result[0]["operation_id"] == str(operation_id)
    assert result[0]["created_at"] == str(created_at)
    assert result[0]["before"] == {"name": "Old"}
    assert "fingerprint" not in result[0]


def test_postgres_pending_record_keeps_nullable_result():
    store, pool = make_store()
    pool.row = {
        "operation_id": uuid.uuid4(),
        "product_id": 3704,
        "fingerprint": "b" * 64,
        "reason": "Test only",
        "actor": "operator",
        "created_at": datetime.now(timezone.utc),
        "state": "pending",
        "before": None,
        "after": None,
        "result": None,
        "http_status": None,
    }
    result = asyncio.run(store.find("a" * 64))
    assert result["result"] is None
    assert result["http_status"] is None


def test_postgres_store_lock_save_unlock_and_ping():
    store, pool = make_store()
    operation_id = str(uuid.uuid4())
    pool.row = {"product_id": 3704}

    async def run():
        assert await store.lock(3704, operation_id) is True
        await store.save("a" * 64, {"state": "verified", "result": {"verified": True}})
        await store.unlock(3704, operation_id)
        await store.ping()
        await store.close()

    asyncio.run(run())
    assert any(call[0] == "execute" and "UPDATE public.operator_audit" in call[1]
               for call in pool.calls)
    assert any(call[0] == "execute" and "DELETE FROM public.operator_locks" in call[1]
               for call in pool.calls)
    assert pool.closed is True


def test_operator_migration_is_private_and_defines_both_tables():
    migration = (Path(__file__).parent / "supabase" / "migrations" /
                 "002_operator_api.sql").read_text(encoding="utf-8")
    assert "create table if not exists public.operator_audit" in migration.lower()
    assert "create table if not exists public.operator_locks" in migration.lower()
    assert migration.lower().count("enable row level security") == 2
    assert "revoke all on table public.operator_audit from anon, authenticated" in migration.lower()


def test_operator_environment_example_excludes_legacy_mongodb():
    backend = Path(__file__).parent
    operator_names = (backend / ".env.example").read_text(encoding="utf-8")
    legacy_names = (backend / "legacy.env.example").read_text(encoding="utf-8")
    assert "DATABASE_URL=" in operator_names
    assert "MONGO_URL=" not in operator_names
    assert "DB_NAME=" not in operator_names
    assert "MONGO_URL=" in legacy_names
    assert "DB_NAME=" in legacy_names
