import asyncio
import os

import httpx
import pytest
from fastapi import FastAPI

from operator_api import OperatorError, create_router
from printful_api import (AW26_TEMPLATE_IDS, PrintfulClient, normalize_template_detail,
                          select_representative_variants)


TOKEN = "printful-test-token-that-must-never-leak"
TEST_TEMPLATE_ID = min(AW26_TEMPLATE_IDS)
PLAN_ID = "11111111-1111-4111-8111-111111111111"


def client_for(handler):
    return PrintfulClient(httpx.MockTransport(handler))


def run(awaitable):
    return asyncio.run(awaitable)


def template_payload():
    return {
        "id": 12, "title": "Lock Tee", "product_id": 71,
        "external_product_id": "woo-2911", "available_variant_ids": [4016, 4017],
        "colors": [{"color_name": "Black", "color_codes": ["#000000"]}],
        "sizes": ["S", "M"], "mockup_file_url": "https://example.invalid/mockup.jpg",
        "placements": [{"placement": "front"}], "created_at": 1700000000,
        "updated_at": 1700000100,
    }


def test_missing_token(monkeypatch):
    monkeypatch.delenv("PRINTFUL_API_TOKEN", raising=False)
    with pytest.raises(OperatorError) as error:
        run(PrintfulClient().templates(20, 0))
    assert (error.value.status, error.value.code) == (503, "PRINTFUL_NOT_CONFIGURED")


@pytest.mark.parametrize("upstream,status,code", [
    (401, 502, "PRINTFUL_UNAUTHORIZED"),
    (403, 502, "PRINTFUL_FORBIDDEN"),
    (404, 404, "PRINTFUL_NOT_FOUND"),
    (429, 503, "PRINTFUL_RATE_LIMITED"),
    (500, 502, "PRINTFUL_UNAVAILABLE"),
])
def test_sanitized_upstream_errors(monkeypatch, upstream, status, code):
    monkeypatch.setenv("PRINTFUL_API_TOKEN", TOKEN)

    def handler(_request):
        return httpx.Response(upstream, json={"error": {"message": TOKEN}})

    with pytest.raises(OperatorError) as error:
        run(client_for(handler).get("/test"))
    assert (error.value.status, error.value.code) == (status, code)
    assert TOKEN not in error.value.code


def test_template_list_normalization_and_get_only(monkeypatch):
    monkeypatch.setenv("PRINTFUL_API_TOKEN", TOKEN)
    captured = []

    def handler(request):
        captured.append(request)
        return httpx.Response(200, json={"code": 200, "result": {"items": [template_payload()]},
                                         "paging": {"total": 1, "limit": 20, "offset": 0}})

    result = run(client_for(handler).templates(20, 0))
    assert result["total"] == 1
    assert result["items"][0] == {
        "id": 12, "title": "Lock Tee", "catalogProductId": 71,
        "externalProductId": "woo-2911", "availableVariantIds": [4016, 4017],
        "colors": [{"color_name": "Black", "color_codes": ["#000000"]}],
        "sizes": ["S", "M"], "mockupUrl": "https://example.invalid/mockup.jpg",
        "placements": [{"placement": "front"}],
        "createdAt": "2023-11-14T22:13:20Z", "updatedAt": "2023-11-14T22:15:00Z",
    }
    assert captured[0].method == "GET"
    assert dict(captured[0].url.params) == {"limit": "20", "offset": "0"}


def test_single_template_normalization(monkeypatch):
    monkeypatch.setenv("PRINTFUL_API_TOKEN", TOKEN)

    def handler(request):
        assert request.url.path == "/product-templates/12"
        return httpx.Response(200, json={"code": 200, "result": template_payload()})

    result = run(client_for(handler).template(12))
    assert result["catalogProductId"] == 71
    assert result["mockups"] == [{
        "url": "https://example.invalid/mockup.jpg", "placement": None,
        "position": None, "color": None, "variantIds": [], "type": None,
    }]


def test_template_multiple_mockups_are_normalized_and_deduplicated():
    raw = template_payload()
    raw["mockups"] = [
        {"mockup_url": "https://example.invalid/front.jpg", "placement": "front",
         "position": "front", "color": "Black", "variant_ids": [4016], "type": "flat"},
        {"image_url": "https://example.invalid/back.jpg", "placement": "back",
         "view_name": "back", "color_name": "Black", "restricted_to_variants": [4017]},
        {"url": "https://example.invalid/front.jpg", "placement": "duplicate"},
    ]
    result = normalize_template_detail(raw)
    assert [item["url"] for item in result["mockups"]] == [
        "https://example.invalid/front.jpg",
        "https://example.invalid/back.jpg",
        "https://example.invalid/mockup.jpg",
    ]
    assert result["mockups"][0] == {
        "url": "https://example.invalid/front.jpg", "placement": "front",
        "position": "front", "color": "Black", "variantIds": [4016], "type": "flat",
    }
    assert result["mockups"][1]["variantIds"] == [4017]


def test_template_without_mockups_returns_empty_gallery():
    raw = template_payload()
    raw.pop("mockup_file_url")
    assert normalize_template_detail(raw)["mockups"] == []


def test_sync_product_normalization(monkeypatch):
    monkeypatch.setenv("PRINTFUL_API_TOKEN", TOKEN)
    monkeypatch.setenv("PRINTFUL_STORE_ID", "123")
    raw = {
        "sync_product": {"id": 99, "external_id": "3704", "name": "Soul Piece Cap",
                         "variants": 1, "synced": 1, "thumbnail_url": "https://example.invalid/cap.jpg"},
        "sync_variants": [{"id": 100, "external_id": "3704", "sync_product_id": 99,
                           "name": "Cap", "synced": True, "variant_id": 7854,
                           "retail_price": "30.00", "currency": "USD", "files": []}],
    }

    def handler(_request):
        return httpx.Response(200, json={"code": 200, "result": raw})

    result = run(client_for(handler).sync_product(99))
    assert result["syncProductId"] == 99
    assert result["variants"][0]["catalogVariantId"] == 7854
    assert result["variants"][0]["externalId"] == "3704"


def test_account_token_resolves_single_woocommerce_store(monkeypatch):
    monkeypatch.setenv("PRINTFUL_API_TOKEN", TOKEN)
    monkeypatch.delenv("PRINTFUL_STORE_ID", raising=False)
    requests = []

    def handler(request):
        requests.append(request)
        if request.url.path == "/stores":
            return httpx.Response(200, json={"code": 200, "result": [
                {"id": 321, "name": "Lock City", "type": "woocommerce"}]})
        assert request.headers["X-PF-Store-Id"] == "321"
        return httpx.Response(200, json={"code": 200, "result": [],
                                         "paging": {"total": 0, "limit": 20, "offset": 0}})

    result = run(client_for(handler).sync_products(20, 0))
    assert result["total"] == 0
    assert [request.method for request in requests] == ["GET", "GET"]


def test_multiple_stores_require_explicit_store_id(monkeypatch):
    monkeypatch.setenv("PRINTFUL_API_TOKEN", TOKEN)
    monkeypatch.delenv("PRINTFUL_STORE_ID", raising=False)

    def handler(_request):
        return httpx.Response(200, json={"code": 200, "result": [
            {"id": 1, "type": "woocommerce"}, {"id": 2, "type": "woocommerce"}]})

    with pytest.raises(OperatorError) as error:
        run(client_for(handler).sync_products(20, 0))
    assert (error.value.status, error.value.code) == (503, "PRINTFUL_STORE_NOT_CONFIGURED")


class Store:
    def __init__(self):
        self.plan = None

    async def ping(self):
        return None

    async def audit(self, _page, _size):
        return []

    async def create_mockup_plan(self, plan):
        self.plan = {"plan_id": PLAN_ID, "template_id": plan["templateId"],
                     "product": plan["product"],
                     "variants": plan["selectedRepresentativeVariants"],
                     "styles": plan["requestedStyles"], "status": "planned"}
        return PLAN_ID

    async def claim_mockup_plan(self, plan_id, template_id):
        if (not self.plan or self.plan["plan_id"] != plan_id
                or self.plan["template_id"] != template_id
                or self.plan["status"] != "planned"):
            return None
        self.plan["status"] = "scheduling"
        return self.plan

    async def complete_mockup_plan(self, plan_id, _template_id, task_keys):
        assert self.plan["plan_id"] == plan_id
        self.plan["task_keys"] = task_keys
        self.plan["status"] = "pending"

    async def fail_mockup_plan(self, plan_id, _template_id):
        assert self.plan["plan_id"] == plan_id
        self.plan["status"] = "failed"

    async def mockup_task_context(self, task_key):
        if not self.plan or task_key not in self.plan.get("task_keys", []):
            return None
        return self.plan

    async def record_mockup_task_status(self, _context, _task_key, status):
        self.plan["last_status"] = status


class Printful:
    def __init__(self):
        self.created = 0

    async def templates(self, _limit, _offset):
        return {"items": [], "limit": 1, "offset": 0, "total": 0}

    async def sync_products(self, _limit, _offset):
        return {"items": [], "limit": 1, "offset": 0, "total": 0}

    async def template(self, template_id):
        return {"id": template_id}

    async def sync_product(self, product_id):
        return {"syncProductId": product_id}

    async def mockup_styles(self, template_id):
        return {"templateId": template_id, "styles": []}

    async def mockup_plan(self, template_id):
        return {"templateId": template_id, "product": {"id": 71, "name": "AW26 Tee"},
                "selectedRepresentativeVariants": [{"id": 4016, "color": "Black", "size": "M"}],
                "colors": ["Black"], "placements": ["front"],
                "requestedStyles": [{"id": 3, "placement": "front", "view": "Front"}],
                "estimatedTaskCount": 1}

    async def create_mockup_task(self, template_id, variant_ids, style_ids):
        self.created += 1
        return {"templateId": template_id, "taskIds": [101]}

    async def mockup_task(self, task_id):
        return {"id": task_id, "status": "completed", "mockups": []}


@pytest.mark.parametrize("path", [
    "/api/operator/v1/printful/status",
    "/api/operator/v1/printful/templates",
    "/api/operator/v1/printful/templates/12",
    "/api/operator/v1/printful/sync-products",
    "/api/operator/v1/printful/sync-products/99",
    "/api/operator/v1/printful/templates/12/mockup-styles",
    "/api/operator/v1/printful/mockup-tasks/101",
])
def test_operator_routes_require_auth(monkeypatch, path):
    monkeypatch.setenv("OPERATOR_API_TOKEN", "o" * 32)
    monkeypatch.setenv("OPERATOR_WRITES_ENABLED", "false")
    app = FastAPI()
    app.include_router(create_router(Store(), printful=Printful()))

    async def request(method, path, headers=None):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),
                                     base_url="http://test") as client:
            return await client.request(method, path, headers=headers)

    assert run(request("GET", path)).status_code == 401
    headers = {"Authorization": "Bearer " + "o" * 32}
    assert run(request("GET", path, headers)).status_code in (200, 404)


def test_operator_routes_are_get_only_and_writes_stay_disabled(monkeypatch):
    monkeypatch.setenv("OPERATOR_API_TOKEN", "o" * 32)
    monkeypatch.setenv("OPERATOR_WRITES_ENABLED", "false")
    app = FastAPI()
    app.include_router(create_router(Store(), printful=Printful()))

    async def request(method, path):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),
                                     base_url="http://test") as client:
            return await client.request(method, path,
                                        headers={"Authorization": "Bearer " + "o" * 32})

    status = run(request("GET", "/api/operator/v1/printful/status")).json()
    assert status == {"ok": True, "productTemplatesRead": True, "syncProductsRead": True}
    assert run(request("POST", "/api/operator/v1/printful/templates")).status_code == 405
    assert run(request("PUT", "/api/operator/v1/printful/sync-products/1")).status_code == 405
    assert run(request("DELETE", "/api/operator/v1/printful/templates/1")).status_code == 405
    assert os.getenv("OPERATOR_WRITES_ENABLED") == "false"


def test_aw26_allowlist_has_exactly_seventeen_templates():
    assert len(AW26_TEMPLATE_IDS) == 17
    assert 105623495 in AW26_TEMPLATE_IDS
    assert 106766446 in AW26_TEMPLATE_IDS
    assert 107531332 not in AW26_TEMPLATE_IDS
    assert 107691146 not in AW26_TEMPLATE_IDS
    assert all(type(template_id) is int and template_id > 0
               for template_id in AW26_TEMPLATE_IDS)


def test_representative_variant_selection_prefers_m_then_s_per_color():
    variants = [
        {"id": 1, "color": "Black", "size": "S"},
        {"id": 2, "color": "Black", "size": "M"},
        {"id": 3, "color": "Black", "size": "L"},
        {"id": 4, "color": "White", "size": "S"},
        {"id": 5, "color": "White", "size": "L"},
        {"id": 6, "color": "Navy", "size": "XL"},
        {"id": 7, "color": "Navy", "size": "2XL"},
    ]
    selected = select_representative_variants(range(1, 8), variants)
    assert [(item["color"], item["size"], item["id"]) for item in selected] == [
        ("Black", "M", 2), ("White", "S", 4), ("Navy", "XL", 6)]


def test_representative_variant_selection_supports_one_size():
    selected = select_representative_variants(
        [80], [{"id": 80, "color": "Black", "size": "One Size"}])
    assert selected == [{"id": 80, "color": "Black", "size": "One Size"}]


def test_mockup_plan_uses_only_get_and_supported_capabilities(monkeypatch):
    monkeypatch.setenv("PRINTFUL_API_TOKEN", TOKEN)
    requests = []

    def handler(request):
        requests.append(request)
        if request.url.path == "/product-templates/12":
            return httpx.Response(200, json={"code": 200, "result": template_payload()})
        if request.url.path.endswith("/catalog-variants"):
            return httpx.Response(200, json={"data": [
                {"id": 4016, "color": "Black", "size": "M"},
                {"id": 4017, "color": "White", "size": "S"},
            ], "paging": {"total": 2}})
        if request.url.path.endswith("/mockup-styles"):
            return httpx.Response(200, json={"data": [
                {"placement": "front", "display_name": "Front print", "mockup_styles": [
                    {"id": 3, "category_name": "Lifestyle", "view_name": "Front",
                     "restricted_to_variants": None}]},
                {"placement": "back", "display_name": "Back print", "mockup_styles": [
                    {"id": 4, "category_name": "Model", "view_name": "Back",
                     "restricted_to_variants": [4016, 4017]}]},
            ], "paging": {"total": 2}})
        raise AssertionError(f"unexpected request: {request.url}")

    plan = run(client_for(handler).mockup_plan(12))
    assert plan["selectedRepresentativeVariants"] == [
        {"id": 4016, "color": "Black", "size": "M"},
        {"id": 4017, "color": "White", "size": "S"},
    ]
    assert plan["placements"] == ["front", "back"]
    assert [style["id"] for style in plan["requestedStyles"]] == [3, 4]
    assert plan["estimatedTaskCount"] == 1
    assert all(request.method == "GET" for request in requests)


def test_dry_run_is_authenticated_allowlisted_and_never_generates(monkeypatch):
    monkeypatch.setenv("OPERATOR_API_TOKEN", "o" * 32)
    monkeypatch.setenv("OPERATOR_WRITES_ENABLED", "false")
    monkeypatch.delenv("PRINTFUL_MOCKUP_GENERATION_ENABLED", raising=False)
    store, printful = Store(), Printful()
    app = FastAPI()
    app.include_router(create_router(store, printful=printful))

    async def post(template_id, authenticated=True):
        headers = {"Authorization": "Bearer " + "o" * 32} if authenticated else {}
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),
                                     base_url="http://test") as client:
            return await client.post(
                f"/api/operator/v1/printful/templates/{template_id}/mockup-tasks/dry-run",
                headers=headers)

    assert run(post(TEST_TEMPLATE_ID, False)).status_code == 401
    denied = run(post(12))
    assert denied.status_code == 403
    assert denied.json() == {"error": "TEMPLATE_NOT_ALLOWED"}
    response = run(post(TEST_TEMPLATE_ID))
    assert response.status_code == 200
    assert response.json()["planId"] == PLAN_ID
    assert response.json()["estimatedTaskCount"] == 1
    assert printful.created == 0
    assert os.getenv("OPERATOR_WRITES_ENABLED") == "false"


def test_mockup_generation_is_separately_gated(monkeypatch):
    monkeypatch.setenv("OPERATOR_API_TOKEN", "o" * 32)
    monkeypatch.setenv("OPERATOR_WRITES_ENABLED", "false")
    monkeypatch.delenv("PRINTFUL_MOCKUP_GENERATION_ENABLED", raising=False)
    store, printful = Store(), Printful()
    app = FastAPI()
    app.include_router(create_router(store, printful=printful))

    async def request(body, authenticated=True):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),
                                     base_url="http://test") as client:
            return await client.post(
                f"/api/operator/v1/printful/templates/{TEST_TEMPLATE_ID}/mockup-tasks",
                json=body,
                headers={"Authorization": "Bearer " + "o" * 32} if authenticated else {})

    async def get_task():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),
                                     base_url="http://test") as client:
            return await client.get(
                "/api/operator/v1/printful/mockup-tasks/101",
                headers={"Authorization": "Bearer " + "o" * 32})

    body = {"planId": PLAN_ID}
    assert run(request(body, False)).status_code == 401
    assert run(request(body)).json() == {"error": "MOCKUP_GENERATION_DISABLED"}
    assert printful.created == 0
    monkeypatch.setenv("PRINTFUL_MOCKUP_GENERATION_ENABLED", "true")
    assert run(request({"variantIds": [4016], "styleIds": [12]})).status_code == 400
    store.plan = {"plan_id": PLAN_ID, "template_id": TEST_TEMPLATE_ID,
                  "product": {"id": 71, "name": "AW26 Tee"},
                  "variants": [{"id": 4016, "color": "Black", "size": "M"}],
                  "styles": [{"id": 3, "placement": "front", "view": "Front"}],
                  "status": "planned"}
    result = run(request(body)).json()
    assert result["templateId"] == TEST_TEMPLATE_ID
    assert result["taskKeys"] == [101]
    assert result["requestedVariants"] == store.plan["variants"]
    assert printful.created == 1
    assert run(request(body)).status_code == 409
    task = run(get_task())
    assert task.status_code == 200
    assert task.json()["templateId"] == TEST_TEMPLATE_ID
    assert task.json()["status"] == "completed"
    assert printful.created == 1
    assert os.getenv("OPERATOR_WRITES_ENABLED") == "false"


def test_printful_task_generation_and_result(monkeypatch):
    monkeypatch.setenv("PRINTFUL_API_TOKEN", TOKEN)
    monkeypatch.setenv("PRINTFUL_STORE_ID", "321")
    requests = []

    def handler(request):
        requests.append(request)
        if request.url.path == "/product-templates/12":
            return httpx.Response(200, json={"code": 200, "result": template_payload()})
        if request.url.path.endswith("/mockup-styles"):
            return httpx.Response(200, json={
                "data": [{"placement": "front", "display_name": "Front", "mockup_styles": [
                    {"id": 3, "category_name": "Flat", "view_name": "Front",
                     "restricted_to_variants": [4016]}]}], "paging": {"total": 1}})
        if request.method == "POST":
            assert request.headers["X-PF-Store-Id"] == "321"
            assert request.content and b'"source": "product_template"' in request.content
            return httpx.Response(200, json={"data": [{"id": 987, "status": "pending"}]})
        return httpx.Response(200, json={"data": [{
            "id": 987, "status": "completed", "catalog_variant_mockups": [{
                "catalog_variant_id": 4016, "mockups": [{
                    "mockup_url": "https://example.invalid/generated.jpg", "placement": "front",
                    "display_name": "Front", "style_id": 3, "technique": "dtg"}]}]}]})

    client = client_for(handler)
    assert run(client.create_mockup_task(12, [4016], [3])) == {"templateId": 12, "taskIds": [987]}
    result = run(client.mockup_task(987))
    assert result["mockups"][0]["variantId"] == 4016
    assert result["mockups"][0]["placement"] == "front"
    assert result["mockups"][0]["view"] == "Front"
    assert [request.method for request in requests] == ["GET", "GET", "GET", "POST", "GET"]


@pytest.mark.parametrize("upstream,status,code", [
    (400, 502, "PRINTFUL_MOCKUP_REQUEST_REJECTED"),
    (401, 502, "PRINTFUL_UNAUTHORIZED"),
    (403, 502, "PRINTFUL_FORBIDDEN"),
    (404, 404, "PRINTFUL_NOT_FOUND"),
    (429, 503, "PRINTFUL_RATE_LIMITED"),
    (500, 502, "PRINTFUL_UNAVAILABLE"),
])
def test_mockup_generation_errors_are_sanitized(monkeypatch, upstream, status, code):
    monkeypatch.setenv("PRINTFUL_API_TOKEN", TOKEN)
    monkeypatch.setenv("PRINTFUL_STORE_ID", "321")

    def handler(request):
        if request.url.path == "/product-templates/12":
            return httpx.Response(200, json={"code": 200, "result": template_payload()})
        if request.url.path.endswith("/mockup-styles"):
            return httpx.Response(200, json={
                "data": [{"placement": "front", "mockup_styles": [
                    {"id": 3, "restricted_to_variants": [4016]}]}],
                "paging": {"total": 1}})
        return httpx.Response(upstream, json={"error": {"message": TOKEN}})

    with pytest.raises(OperatorError) as error:
        run(client_for(handler).create_mockup_task(12, [4016], [3]))
    assert (error.value.status, error.value.code) == (status, code)
    assert TOKEN not in error.value.code


def test_secret_never_appears_in_operator_response(monkeypatch):
    monkeypatch.setenv("PRINTFUL_API_TOKEN", TOKEN)
    monkeypatch.setenv("OPERATOR_API_TOKEN", "o" * 32)

    def handler(_request):
        return httpx.Response(403, json={"message": TOKEN})

    app = FastAPI()
    app.include_router(create_router(Store(), printful=client_for(handler)))

    async def request():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),
                                     base_url="http://test") as client:
            return await client.get("/api/operator/v1/printful/templates",
                                    headers={"Authorization": "Bearer " + "o" * 32})

    response = run(request())
    assert response.status_code == 502
    assert response.json() == {"error": "PRINTFUL_FORBIDDEN"}
    assert TOKEN not in response.text
