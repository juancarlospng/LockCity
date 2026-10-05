import asyncio
import copy

import httpx
import pytest
from fastapi import FastAPI

from operator_api import (AW26_ACTIVE_WOO_PRODUCT_IDS,
                          AW26_CATEGORY_POLICY_BY_TEMPLATE_ID,
                          AW26_MERCHANDISING_WRITE_PRODUCT_IDS,
                          AW26_WOO_PRODUCT_IDS, OperatorError, WooClient,
                          aw26_commercial_version, create_router, digest,
                          order_view, preorder_status_view, product_view)


class Store:
    def __init__(self):
        self.records = {}
        self.locks = set()
        self.reconcile_versions = {}

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

    async def reconcile_uncertain_lock(self, product_id, expected_version):
        if self.reconcile_versions.get(product_id) != expected_version:
            return False
        self.locks.discard(product_id)
        return True

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

    async def preorder_status(self):
        return preorder_status_view({
            "aw26_preorder_sales_enabled": False,
            "source": "wordpress_runtime",
            "environment": "production",
            "checked_at": "2026-10-05T00:00:00Z",
        })

    async def orders(self, filters):
        return {"items": [], "count": 0, "scanned": 0, "scan_limited": False,
                "filters": filters}

    async def order(self, order_id):
        if order_id != 25:
            raise OperatorError(404, "ORDER_NOT_FOUND")
        return order_view({"id": 25, "status": "pending", "line_items": []})


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


@pytest.mark.parametrize("path", [
    "/status", "/products", "/products/1", "/audit", "/preorder/status",
    "/orders", "/orders/25", "/printful/orders", "/printful/orders/1",
])
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


def test_preorder_status_is_effective_runtime_value_only(setup):
    response = request(setup, "GET", "/preorder/status")
    assert response.status_code == 200
    assert response.json() == {
        "aw26_preorder_sales_enabled": False,
        "source": "wordpress_runtime",
        "environment": "production",
        "checked_at": "2026-10-05T00:00:00Z",
    }


def test_order_filters_and_detail_are_read_only_and_pii_free(setup):
    response = request(
        setup, "GET",
        "/orders?status=pending&product_id=3915&payment_method=ppcp-gateway"
        "&after=2026-10-04T23:00:00Z&before=2026-10-05T00:00:00Z&limit=10")
    assert response.status_code == 200
    assert response.json()["filters"]["product_id"] == 3915
    assert request(setup, "GET", "/orders?unknown=1").status_code == 400
    assert request(setup, "GET", "/orders?limit=101").status_code == 400
    assert request(setup, "GET", "/orders/25").status_code == 200
    assert request(setup, "GET", "/orders/26").status_code == 404


def test_order_normalization_allowlists_metadata_notes_and_redacts_pii():
    raw = {
        "id": 25, "date_created": "2026-10-05T01:18:08", "status": "pending",
        "currency": "USD", "total": "36.69", "shipping_total": "4.69",
        "payment_method": "ppcp-gateway", "transaction_id": "secret-transaction",
        "date_paid": None,
        "billing": {"email": "buyer@example.test", "phone": "+123456"},
        "line_items": [{"product_id": 3915, "variation_id": 0, "quantity": 1,
                        "subtotal": "32.00", "total": "32.00",
                        "name": "Lockmark Ribbed Beanie"}],
        "meta_data": [
            {"key": "lock_city_order_type", "value": "PRE_ORDER"},
            {"key": "private_customer_note", "value": "do not expose"},
        ],
    }
    view = order_view(raw, [{
        "date_created": "2026-10-05T01:19:00",
        "note": "PayPal request for buyer@example.test https://private.invalid/x",
    }, {"note": "Customer address changed"}])
    serialized = str(view)
    assert view["transaction_id_present"] is True
    assert view["payment_captured"] is False
    assert view["metadata"] == {"lock_city_order_type": "PRE_ORDER"}
    assert view["order_notes"][0]["note"] == "PayPal request for [REDACTED] [REDACTED URL]"
    assert "secret-transaction" not in serialized
    assert "buyer@example" not in serialized
    assert "private_customer_note" not in serialized


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


def test_observability_transport_is_get_only_and_uses_server_auth(monkeypatch):
    monkeypatch.setenv("WC_REST_URL", "https://store.invalid")
    monkeypatch.setenv("WC_REST_CONSUMER_KEY", "private-key")
    monkeypatch.setenv("WC_REST_CONSUMER_SECRET", "private-secret")
    captured = []

    async def send(_self, method, url, **kwargs):
        captured.append((method, url, kwargs.get("auth")))
        if url.endswith("/lock-city/v1/preorder/status"):
            return httpx.Response(200, json={
                "aw26_preorder_sales_enabled": False, "source": "wordpress_runtime",
                "environment": "production", "checked_at": "2026-10-05T00:00:00Z"})
        if url.endswith("/orders/25/notes"):
            return httpx.Response(200, json=[])
        return httpx.Response(200, json={"id": 25, "status": "pending", "line_items": []})

    monkeypatch.setattr(httpx.AsyncClient, "request", send)
    client = WooClient()
    assert asyncio.run(client.preorder_status())["aw26_preorder_sales_enabled"] is False
    assert asyncio.run(client.order(25))["order_id"] == 25
    assert all(method == "GET" for method, _url, _auth in captured)
    assert all(auth == ("private-key", "private-secret") for _method, _url, auth in captured)


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


class Aw26Woo:
    def __init__(self):
        self.writes = []
        self.category_writes = []
        self.categories = [
            {"id": 43, "name": "Tops", "slug": "top", "parent": 0},
            {"id": 44, "name": "Bottoms", "slug": "bottom", "parent": 0},
        ]
        self.product = {
            "id": 3823, "name": "Lane Seven LS14014 Premium 1/4 Zip Sweatshirt",
            "slug": "lane-seven-ls14014", "status": "draft", "type": "variable",
            "catalog_visibility": "hidden",
            "description": "Current description", "short_description": "Current short",
            "menu_order": 0,
            "regular_price": "", "sale_price": "", "sku": "",
            "stock_status": "instock", "stock_quantity": None,
            "manage_stock": False,
            "categories": [{"id": 19, "name": "AW26", "slug": "aw26"}],
            "images": [{"id": 501, "src": "https://example.invalid/front.jpg", "alt": ""}],
            "attributes": [{"id": 1, "name": "Color", "options": ["Black"], "variation": True},
                           {"id": 2, "name": "Size", "options": ["S", "M"], "variation": True}],
            "variation_ids": [401, 402],
            "variations": [
                {"id": 401, "status": "publish", "color": "Black", "size": "S",
                 "attributes": [{"name": "Color", "option": "Black"},
                                {"name": "Size", "option": "S"}],
                 "regular_price": "70.00", "sale_price": "", "stock_status": "instock",
                 "stock_quantity": None, "manage_stock": False,
                 "sku": "PF-S", "printful": [{"key": "_printful_sync_variant_id", "value": 91}]},
                {"id": 402, "status": "publish", "color": "Black", "size": "M",
                 "attributes": [{"name": "Color", "option": "Black"},
                                {"name": "Size", "option": "M"}],
                 "regular_price": "70.00", "sale_price": "", "stock_status": "instock",
                 "stock_quantity": None, "manage_stock": False,
                 "sku": "PF-M", "printful": [{"key": "_printful_sync_variant_id", "value": 92}]},
            ],
            "printful": [{"key": "_printful_sync_product_id", "value": 81}],
        }
        self._version()

    def _version(self):
        versionless = {key: value for key, value in self.product.items() if key != "version"}
        self.product["version"] = digest(versionless)

    async def get_aw26(self, product_id):
        if product_id != 3823:
            raise OperatorError(404, "PRODUCT_NOT_FOUND")
        return copy.deepcopy(self.product)

    async def get_aw26_catalog(self, product_ids):
        return [copy.deepcopy(self.product) for product_id in product_ids if product_id == 3823]

    async def update_aw26(
            self, product_id, fields, variation_ids, retail_price=None,
            product_type=None):
        self.writes.append((product_id, copy.deepcopy(fields), list(variation_ids),
                            retail_price, product_type))
        for field, value in fields.items():
            if field == "categories":
                self.product[field] = [{"id": item["id"], "name": "", "slug": ""}
                                       for item in value]
            else:
                self.product[field] = value
        if retail_price is not None and product_type == "variable":
            for variation in self.product["variations"]:
                variation["regular_price"] = retail_price
        if retail_price is not None and product_type == "simple":
            self.product["regular_price"] = retail_price
        self._version()

    async def call(self, method, path, params=None, payload=None):
        if path == "products/categories":
            if method == "GET":
                return copy.deepcopy(self.categories), {"X-WP-TotalPages": "1"}
            if method == "POST":
                created = {"id": 100 + len(self.category_writes), **payload}
                self.category_writes.append(copy.deepcopy(payload))
                self.categories.append(created)
                return copy.deepcopy(created), {}
            raise AssertionError(method)
        if method == "GET" and path == "products":
            return [self.product], {"X-WP-Total": "1", "X-WP-TotalPages": "1"}
        raise AssertionError((method, path))


@pytest.fixture
def aw26_setup(monkeypatch):
    monkeypatch.setenv("OPERATOR_API_TOKEN", "t" * 32)
    monkeypatch.setenv("OPERATOR_WRITES_ENABLED", "false")
    monkeypatch.setenv("AW26_PRODUCT_WRITE_ENABLED", "false")
    monkeypatch.setenv("AW26_PUBLISH_ENABLED", "false")
    store, woo = Store(), Aw26Woo()
    app = FastAPI()
    app.include_router(create_router(store, woo))
    return app, store, woo


def aw26_body(aw26_setup):
    return {
        "name": "LC Code Quarter-Zip Sweatshirt", "retail_price": "78.00",
        "reason": "Apply approved AW26 name and retail price",
        "idempotency_key": "aw26-product-3823-pilot-01",
        "expected_version": aw26_setup[2].product["version"],
    }


def test_aw26_detailed_read_is_authenticated_and_allowlisted(aw26_setup):
    assert AW26_WOO_PRODUCT_IDS == frozenset({
        3823, 3854, 3915, 3923, 3932, 3941, 3950, 3973, 3979,
        3996, 4005, 4022, 4040, 4048, 4067, 4084, 4093, 4102, 4143,
    })
    assert len(AW26_WOO_PRODUCT_IDS) == 19
    assert AW26_ACTIVE_WOO_PRODUCT_IDS == AW26_WOO_PRODUCT_IDS - {4102}
    assert len(AW26_ACTIVE_WOO_PRODUCT_IDS) == 18
    assert AW26_MERCHANDISING_WRITE_PRODUCT_IDS == AW26_ACTIVE_WOO_PRODUCT_IDS
    assert len(AW26_CATEGORY_POLICY_BY_TEMPLATE_ID) == 17
    assert request(aw26_setup, "GET", "/aw26/products/3823", headers={}).status_code == 401
    response = request(aw26_setup, "GET", "/aw26/products/3823")
    assert response.status_code == 200
    assert response.json()["variation_ids"] == [401, 402]
    assert response.json()["printful"][0]["key"] == "_printful_sync_product_id"
    assert request(aw26_setup, "GET", "/aw26/products/3704").status_code == 403


def test_aw26_catalog_read_is_authenticated(aw26_setup):
    assert request(aw26_setup, "GET", "/aw26/products", headers={}).status_code == 401
    response = request(aw26_setup, "GET", "/aw26/products")
    assert response.status_code == 200
    assert response.json()["products"][0]["id"] == 3823


def test_aw26_category_bootstrap_is_authenticated_flagged_and_idempotent(aw26_setup, monkeypatch):
    assert request(aw26_setup, "GET", "/aw26/categories", headers={}).status_code == 401
    assert request(aw26_setup, "POST", "/aw26/categories/bootstrap").status_code == 403
    monkeypatch.setenv("AW26_PRODUCT_WRITE_ENABLED", "true")
    first = request(aw26_setup, "POST", "/aw26/categories/bootstrap")
    assert first.status_code == 200
    assert aw26_setup[2].category_writes == [
        {"name": "Accessories", "slug": "accessories", "parent": 0},
        {"name": "AW26", "slug": "aw26", "parent": 0},
    ]
    second = request(aw26_setup, "POST", "/aw26/categories/bootstrap")
    assert second.status_code == 200
    assert len(aw26_setup[2].category_writes) == 2
    assert all(item["created"] is False for item in second.json()["categories"])


def test_aw26_category_bootstrap_rejects_unsafe_publish_flag(aw26_setup, monkeypatch):
    monkeypatch.setenv("AW26_PRODUCT_WRITE_ENABLED", "true")
    monkeypatch.setenv("AW26_PUBLISH_ENABLED", "true")
    response = request(aw26_setup, "POST", "/aw26/categories/bootstrap")
    assert response.status_code == 503
    assert response.json()["error"] == "AW26_PUBLISH_CONFIGURATION_UNSAFE"
    assert aw26_setup[2].category_writes == []


def test_aw26_patch_has_independent_disabled_flag(aw26_setup):
    response = request(aw26_setup, "PATCH", "/aw26/products/3823", json=aw26_body(aw26_setup))
    assert response.status_code == 403
    assert response.json()["error"] == "AW26_PRODUCT_WRITES_DISABLED"


def test_aw26_excluded_product_is_readable_but_not_merchandising_writable(
        aw26_setup, monkeypatch):
    monkeypatch.setenv("AW26_PRODUCT_WRITE_ENABLED", "true")
    response = request(
        aw26_setup, "PATCH", "/aw26/products/4102", json=aw26_body(aw26_setup))
    assert response.status_code == 403
    assert response.json()["error"] == "AW26_MERCHANDISING_WRITE_NOT_ALLOWED"
    assert aw26_setup[2].writes == []


def test_aw26_hard_hide_is_exact_authenticated_and_idempotent(aw26_setup, monkeypatch):
    aw26_setup[2].product["status"] = "private"
    aw26_setup[2].product["catalog_visibility"] = "visible"
    aw26_setup[2]._version()
    product = copy.deepcopy(aw26_setup[2].product)
    body = {
        "reason": "AW26 pre-launch hard hide",
        "expected_version": product["version"],
        "idempotency_key": "aw26-hard-hide-3823-0001",
    }
    path = "/aw26/products/3823/hard-hide"
    assert request(aw26_setup, "PATCH", path, json=body, headers={}).status_code == 401
    assert request(aw26_setup, "PATCH", path, json=body).status_code == 403
    monkeypatch.setenv("AW26_PRODUCT_WRITE_ENABLED", "true")
    response = request(aw26_setup, "PATCH", path, json=body)
    assert response.status_code == 200
    assert response.json()["verified"] is True
    after = response.json()["product"]
    assert after["status"] == "draft"
    assert after["catalog_visibility"] == "hidden"
    assert aw26_setup[2].writes == [(
        3823, {"status": "draft", "catalog_visibility": "hidden"}, [401, 402],
        None, None)]
    assert request(aw26_setup, "PATCH", path, json=body).json() == response.json()
    assert len(aw26_setup[2].writes) == 1
    expected = {key: value for key, value in product.items()
                if key not in {"status", "catalog_visibility", "version"}}
    observed = {key: value for key, value in after.items()
                if key not in {"status", "catalog_visibility", "version"}}
    assert observed == expected


def test_aw26_hard_hide_rejects_extra_fields_and_merchandising_is_allowlisted(
        aw26_setup, monkeypatch):
    monkeypatch.setenv("AW26_PRODUCT_WRITE_ENABLED", "true")
    body = {
        "reason": "AW26 pre-launch hard hide",
        "expected_version": aw26_setup[2].product["version"],
        "idempotency_key": "aw26-hard-hide-3823-0002",
        "name": "Not allowed",
    }
    response = request(aw26_setup, "PATCH", "/aw26/products/3823/hard-hide", json=body)
    assert response.status_code == 400
    assert response.json()["error"] == "INVALID_AW26_HARD_HIDE"
    merchandising = request(
        aw26_setup, "PATCH", "/aw26/products/3704", json=aw26_body(aw26_setup))
    assert merchandising.status_code == 403
    assert merchandising.json()["error"] == "AW26_PRODUCT_NOT_ALLOWED"
    assert aw26_setup[2].writes == []


def test_aw26_patch_updates_only_parent_allowlist_and_variation_prices(aw26_setup, monkeypatch):
    monkeypatch.setenv("AW26_PRODUCT_WRITE_ENABLED", "true")
    before = copy.deepcopy(aw26_setup[2].product)
    payload = aw26_body(aw26_setup)
    response = request(aw26_setup, "PATCH", "/aw26/products/3823", json=payload)
    assert response.status_code == 200 and response.json()["verified"] is True
    assert aw26_setup[2].writes == [(
        3823, {"name": payload["name"]}, [401, 402], "78.00", "variable")]
    after = response.json()["product"]
    assert after["status"] == "draft" and after["catalog_visibility"] == "hidden"
    assert after["variation_ids"] == [401, 402]
    assert {item["regular_price"] for item in after["variations"]} == {"78.00"}
    assert [item["sku"] for item in after["variations"]] == ["PF-S", "PF-M"]
    assert [item["stock_status"] for item in after["variations"]] == ["instock", "instock"]
    audit = list(aw26_setup[1].records.values())[0]
    assert audit["before"]["name"] == before["name"]
    assert audit["after"]["name"] == payload["name"]
    assert request(aw26_setup, "PATCH", "/aw26/products/3823", json=payload).json() == response.json()
    assert len(aw26_setup[2].writes) == 1


def test_aw26_patch_reconciles_only_matching_uncertain_lock(aw26_setup, monkeypatch):
    monkeypatch.setenv("AW26_PRODUCT_WRITE_ENABLED", "true")
    payload = aw26_body(aw26_setup)
    aw26_setup[1].locks.add(3823)
    aw26_setup[1].reconcile_versions[3823] = payload["expected_version"]
    response = request(aw26_setup, "PATCH", "/aw26/products/3823", json=payload)
    assert response.status_code == 200
    assert response.json()["verified"] is True
    assert len(aw26_setup[2].writes) == 1


@pytest.mark.parametrize("change", [
    {"status": "publish"}, {"sku": "CHANGED"}, {"stock_status": "outofstock"},
    {"variations": []}, {"retail_price": 78}, {"categories": [19, 19]},
])
def test_aw26_patch_rejects_non_allowlisted_fields_and_invalid_values(aw26_setup, monkeypatch, change):
    monkeypatch.setenv("AW26_PRODUCT_WRITE_ENABLED", "true")
    response = request(aw26_setup, "PATCH", "/aw26/products/3823",
                       json={**aw26_body(aw26_setup), **change})
    assert response.status_code == 400
    assert aw26_setup[2].writes == []


def test_aw26_patch_requires_hard_hidden_product_and_current_version(aw26_setup, monkeypatch):
    monkeypatch.setenv("AW26_PRODUCT_WRITE_ENABLED", "true")
    stale = {**aw26_body(aw26_setup), "expected_version": "a" * 64}
    assert request(aw26_setup, "PATCH", "/aw26/products/3823", json=stale).status_code == 409
    aw26_setup[2].product["status"] = "publish"
    aw26_setup[2]._version()
    current = {**aw26_body(aw26_setup), "expected_version": aw26_setup[2].product["version"],
               "idempotency_key": "aw26-product-3823-pilot-02"}
    response = request(aw26_setup, "PATCH", "/aw26/products/3823", json=current)
    assert response.status_code == 409 and response.json()["error"] == "PRODUCT_NOT_HARD_HIDDEN"
    assert aw26_setup[2].writes == []


def test_aw26_patch_updates_simple_parent_price_without_variations(aw26_setup, monkeypatch):
    monkeypatch.setenv("AW26_PRODUCT_WRITE_ENABLED", "true")
    product = aw26_setup[2].product
    product.update({
        "type": "simple", "variation_ids": [], "variations": [],
        "regular_price": "28.00", "sku": "BEANIE-ONE",
    })
    product["attributes"] = []
    aw26_setup[2]._version()
    payload = {
        "name": "Lockmark Ribbed Beanie",
        "retail_price": "36.00",
        "reason": "Approved AW26 simple product merchandising",
        "idempotency_key": "aw26-simple-product-3823-01",
        "expected_version": product["version"],
    }
    response = request(aw26_setup, "PATCH", "/aw26/products/3823", json=payload)
    assert response.status_code == 200
    after = response.json()["product"]
    assert response.json()["verified"] is True
    assert after["regular_price"] == "36.00"
    assert after["sku"] == "BEANIE-ONE"
    assert after["variations"] == []
    assert aw26_setup[2].writes == [(
        3823, {"name": "Lockmark Ribbed Beanie"}, [], "36.00", "simple")]


def test_aw26_patch_refuses_unsafe_publish_configuration(aw26_setup, monkeypatch):
    monkeypatch.setenv("AW26_PRODUCT_WRITE_ENABLED", "true")
    monkeypatch.setenv("AW26_PUBLISH_ENABLED", "true")
    response = request(aw26_setup, "PATCH", "/aw26/products/3823", json=aw26_body(aw26_setup))
    assert response.status_code == 503
    assert response.json()["error"] == "AW26_PUBLISH_CONFIGURATION_UNSAFE"
    assert aw26_setup[2].writes == []


def commercial_raw():
    product = {
        "id": 3823, "name": "Quarter Zip", "status": "private", "type": "variable",
        "catalog_visibility": "hidden", "description": "Description",
        "short_description": "Short", "menu_order": 2,
        "categories": [{"id": 44, "name": "Bottoms"}],
        "attributes": [
            {"name": "Size", "options": ["M", "S"], "variation": True},
            {"name": "Color", "options": ["Navy", "Black"], "variation": True},
        ],
        "images": [{"id": 11, "src": "https://one.invalid/a.jpg"},
                   {"id": 12, "src": "https://one.invalid/b.jpg"}],
        "date_modified": "2026-01-01T00:00:00", "permalink": "https://one.invalid/product",
        "price_html": "$43.50", "_links": {"self": [{"href": "https://one.invalid"}]},
        "meta_data": [{"key": "runtime_nonce", "value": "first"}],
    }
    variations = [
        {"id": 3825, "regular_price": "43.5", "sale_price": "", "status": "publish",
         "sku": "BLACK-M", "stock_status": "instock", "stock_quantity": None,
         "manage_stock": False, "attributes": [
             {"name": "Size", "option": "M"}, {"name": "Color", "option": "Black"}],
         "date_modified": "2026-01-01T00:00:00", "permalink": "https://one.invalid/v/3825"},
        {"id": 3824, "regular_price": "43.50", "sale_price": "", "status": "publish",
         "sku": "BLACK-S", "stock_status": "instock", "stock_quantity": None,
         "manage_stock": False, "attributes": [
             {"name": "Color", "option": "Black"}, {"name": "Size", "option": "S"}],
         "date_modified": "2026-01-01T00:00:00", "permalink": "https://one.invalid/v/3824"},
    ]
    return product, variations


def test_aw26_version_ignores_changing_timestamps():
    product, variations = commercial_raw()
    expected = aw26_commercial_version(product, variations)
    product["date_created"] = "2030-02-03T04:05:06"
    product["date_modified"] = "2030-02-03T04:05:07"
    product["date_created_gmt"] = "2030-02-03T03:05:06"
    variations[0]["date_modified"] = "2030-02-03T04:05:08"
    assert aw26_commercial_version(product, variations) == expected


def test_aw26_version_ignores_runtime_and_generated_fields():
    product, variations = commercial_raw()
    expected = aw26_commercial_version(product, variations)
    product.update({"permalink": "https://two.invalid/new", "price_html": "dynamic",
                    "_links": {"self": [{"href": "https://two.invalid"}]},
                    "meta_data": [{"key": "runtime_nonce", "value": "second"}]})
    product["images"][0]["src"] = "https://cdn-two.invalid/generated.jpg"
    variations[0]["permalink"] = "https://two.invalid/v/3825"
    assert aw26_commercial_version(product, variations) == expected


def test_aw26_version_changes_with_name():
    product, variations = commercial_raw()
    expected = aw26_commercial_version(product, variations)
    product["name"] = "Changed"
    assert aw26_commercial_version(product, variations) != expected


def test_aw26_version_changes_with_variation_regular_price():
    product, variations = commercial_raw()
    expected = aw26_commercial_version(product, variations)
    variations[0]["regular_price"] = "78.00"
    assert aw26_commercial_version(product, variations) != expected


def test_aw26_version_changes_with_sku():
    product, variations = commercial_raw()
    expected = aw26_commercial_version(product, variations)
    variations[0]["sku"] = "CHANGED"
    assert aw26_commercial_version(product, variations) != expected


def test_aw26_version_changes_with_variation_count():
    product, variations = commercial_raw()
    expected = aw26_commercial_version(product, variations)
    variations.pop()
    assert aw26_commercial_version(product, variations) != expected


def test_aw26_version_changes_with_category():
    product, variations = commercial_raw()
    expected = aw26_commercial_version(product, variations)
    product["categories"] = [{"id": 43, "name": "Tops"}]
    assert aw26_commercial_version(product, variations) != expected
