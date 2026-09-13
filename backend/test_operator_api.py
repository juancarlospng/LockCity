import asyncio
import copy

import httpx
import pytest
from fastapi import FastAPI

from operator_api import OperatorError, WooClient, create_router, digest, product_view


class Store:
    def __init__(self):
        self.records = {}
        self.locks = set()

    async def find(self, key):
        return self.records.get(key)

    async def reserve(self, key, record):
        if key in self.records:
            return False
        self.records[key] = record
        return True

    async def lock(self, product_id, operation_id):
        if product_id in self.locks:
            return False
        self.locks.add(product_id)
        return True

    async def unlock(self, product_id, operation_id):
        self.locks.remove(product_id)

    async def save(self, key, fields):
        self.records[key].update(fields)

    async def audit(self, page, size):
        return list(self.records.values())[(page - 1) * size:page * size]

    async def ping(self):
        pass


class Woo:
    def __init__(self):
        self.raw = {"id": 1, "name": "Old", "meta_data": [{"secret": "hidden"}]}
        self.writes = []
        self.fail = False
        self.mismatch = False

    async def get(self, product_id):
        if product_id != 1:
            raise OperatorError(404, "PRODUCT_NOT_FOUND")
        return product_view(copy.deepcopy(self.raw))

    async def rename(self, product_id, name):
        self.writes.append((product_id, name))
        if self.fail:
            raise OperatorError(502, "WOOCOMMERCE_UNAVAILABLE")
        if not self.mismatch:
            self.raw["name"] = name

    async def call(self, method, path, params=None):
        return [self.raw], {"X-WP-Total": "205", "X-WP-TotalPages": "11"}


@pytest.fixture
def setup(monkeypatch):
    monkeypatch.setenv("OPERATOR_API_TOKEN", "t" * 32)
    monkeypatch.setenv("OPERATOR_WRITES_ENABLED", "true")
    store, woo = Store(), Woo()
    app = FastAPI()
    app.include_router(create_router(store, woo))
    return app, store, woo


def request(setup, method, path, **kwargs):
    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=setup[0]),
                                     base_url="http://test") as client:
            headers = kwargs.pop("headers", {"Authorization": "Bearer " + "t" * 32})
            return await client.request(method, "/api/operator/v1" + path,
                                        headers=headers, **kwargs)
    return asyncio.run(run())


def body(setup):
    return {"name": "New", "reason": "Correct spelling", "idempotency_key": "rename-product-01",
            "expected_version": product_view(setup[2].raw)["version"]}


@pytest.mark.parametrize("path", ["/status", "/products", "/products/1", "/audit"])
def test_auth(setup, path):
    assert request(setup, "GET", path, headers={}).status_code == 401


def test_patch_auth_and_disabled(setup, monkeypatch):
    assert request(setup, "PATCH", "/products/1", json=body(setup), headers={}).status_code == 401
    monkeypatch.setenv("OPERATOR_WRITES_ENABLED", "false")
    assert request(setup, "PATCH", "/products/1", json=body(setup)).status_code == 403
    assert not setup[2].writes


def test_reads_and_pagination(setup):
    assert request(setup, "GET", "/status").status_code == 200
    r = request(setup, "GET", "/products").json()
    assert r["total"] == 205 and r["next_page"] == 2
    assert "hidden" not in str(r)
    assert request(setup, "GET", "/products/2").status_code == 404
    assert request(setup, "GET", "/products?per_page=101").status_code == 400


@pytest.mark.parametrize("change", [{"price": "2"}, {"name": ""}, {"name": 5},
                                    {"reason": ""}, {"name": "<script>"},
                                    {"expected_version": "bad"}, {"idempotency_key": "x"}])
def test_validation(setup, change):
    payload = {**body(setup), **change}
    assert request(setup, "PATCH", "/products/1", json=payload).status_code == 400
    assert not setup[2].writes


def test_verified_audit_and_replay(setup):
    payload = body(setup)
    r = request(setup, "PATCH", "/products/1", json=payload)
    assert r.status_code == 200 and r.json()["verified"] is True
    assert request(setup, "PATCH", "/products/1", json=payload).json() == r.json()
    assert len(setup[2].writes) == 1
    audit = request(setup, "GET", "/audit").json()["operations"][0]
    assert audit["before"]["name"] == "Old" and audit["after"]["name"] == "New"
    assert "hidden" not in str(audit)
    payload["name"] = "Different"
    assert request(setup, "PATCH", "/products/1", json=payload).json()["error"] == "IDEMPOTENCY_CONFLICT"


def test_conflict_in_other_field(setup):
    payload = body(setup)
    setup[2].raw["stock_quantity"] = 3
    r = request(setup, "PATCH", "/products/1", json=payload)
    assert r.status_code == 409 and r.json()["error"] == "VERSION_CONFLICT"
    assert not setup[2].writes


@pytest.mark.parametrize("mode", ["fail", "mismatch"])
def test_uncertain_write_not_retried_and_locked(setup, mode):
    setattr(setup[2], mode, True)
    payload = body(setup)
    r = request(setup, "PATCH", "/products/1", json=payload)
    assert r.status_code == 502 and r.json()["verified"] is False
    assert request(setup, "PATCH", "/products/1", json=payload).json() == r.json()
    assert len(setup[2].writes) == 1 and 1 in setup[1].locks


def test_lock_busy(setup):
    setup[1].locks.add(1)
    assert request(setup, "PATCH", "/products/1", json=body(setup)).json()["error"] == "PRODUCT_BUSY"
    assert not setup[2].writes


def test_audit_failure_prevents_write(setup):
    async def fail(*args):
        raise RuntimeError("private database credentials")
    setup[1].save = fail
    r = request(setup, "PATCH", "/products/1", json=body(setup))
    assert r.status_code == 503 and "private" not in r.text
    assert not setup[2].writes


def test_transport_allowlist_and_sanitization(monkeypatch):
    monkeypatch.setenv("WC_REST_URL", "https://store.invalid")
    monkeypatch.setenv("WC_REST_CONSUMER_KEY", "private-key")
    monkeypatch.setenv("WC_REST_CONSUMER_SECRET", "private-secret")
    captured = []

    async def send(self, method, url, **kwargs):
        captured.append(kwargs["json"])
        return httpx.Response(403, json={"message": "private-secret"})
    monkeypatch.setattr(httpx.AsyncClient, "request", send)
    with pytest.raises(OperatorError) as error:
        asyncio.run(WooClient().rename(1, "Only name"))
    assert error.value.code == "WOOCOMMERCE_ERROR"
    assert captured == [{"name": "Only name"}]


def test_simultaneous_idempotent_requests(setup):
    async def run():
        started, finish = asyncio.Event(), asyncio.Event()
        original = setup[2].rename

        async def paused(product_id, name):
            started.set()
            await finish.wait()
            await original(product_id, name)

        setup[2].rename = paused
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=setup[0]),
                                     base_url="http://test") as client:
            kwargs = {"headers": {"Authorization": "Bearer " + "t" * 32}, "json": body(setup)}
            first = asyncio.create_task(client.patch("/api/operator/v1/products/1", **kwargs))
            await started.wait()
            second = await client.patch("/api/operator/v1/products/1", **kwargs)
            assert second.status_code == 409
            assert second.json()["error"] == "OPERATION_IN_PROGRESS"
            finish.set()
            assert (await first).status_code == 200
            assert len(setup[2].writes) == 1
    asyncio.run(run())


def test_pending_postgres_shape_returns_in_progress(setup):
    payload = body(setup)
    key = digest(payload["idempotency_key"])
    setup[1].records[key] = {
        "operation_id": "pending-operation",
        "fingerprint": digest({"id": 1, **payload}),
        "result": None,
        "http_status": None,
    }
    response = request(setup, "PATCH", "/products/1", json=payload)
    assert response.status_code == 409
    assert response.json()["error"] == "OPERATION_IN_PROGRESS"
    assert not setup[2].writes


def test_post_write_read_failure_keeps_lock(setup):
    original = setup[2].get

    async def read(product_id):
        if setup[2].writes:
            raise OperatorError(502, "WOOCOMMERCE_UNAVAILABLE")
        return await original(product_id)

    setup[2].get = read
    r = request(setup, "PATCH", "/products/1", json=body(setup))
    assert not r.json()["verified"] and 1 in setup[1].locks
    assert list(setup[1].records.values())[0]["state"] == "uncertain"


def test_body_limit_and_prohibited_methods(setup):
    assert request(setup, "PATCH", "/products/1", content="x" * 8193).status_code == 413
    assert request(setup, "DELETE", "/products/1").status_code == 405
    assert not setup[2].writes


def test_missing_operator_config(setup, monkeypatch):
    monkeypatch.delenv("OPERATOR_API_TOKEN")
    assert request(setup, "GET", "/status").json()["error"] == "OPERATOR_NOT_CONFIGURED"
