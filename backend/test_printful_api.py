import asyncio
import json
import os

import httpx
import pytest
from fastapi import FastAPI

from operator_api import OperatorError, create_router
from printful_api import (AW26_TEMPLATE_IDS, PrintfulClient, build_mockup_request_body,
                          group_styles_by_placement,
                          normalize_mockup_task_result, normalize_template_detail,
                          normalize_printful_order,
                          plan_mockup_batches,
                          recommend_styles_by_placement, sanitize_printful_validation,
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
        self.last_plan_selection = None

    async def templates(self, _limit, _offset):
        return {"items": [], "limit": 1, "offset": 0, "total": 0}

    async def scopes(self):
        return {"scopes": ["orders/read"], "orders_read": True}

    async def sync_products(self, _limit, _offset):
        return {"items": [], "limit": 1, "offset": 0, "total": 0}

    async def template(self, template_id):
        return {"id": template_id}

    async def sync_product(self, product_id):
        return {"syncProductId": product_id}

    async def orders(self, limit, offset, status=None, external_id=None):
        return {"items": [], "limit": limit, "offset": offset, "total": 0,
                "status": status, "external_id": external_id}

    async def order(self, order_id):
        return {"printful_order_id": int(str(order_id).lstrip("@") or "0")}

    async def catalog_variant_prices(self, variant_id):
        return {"catalogVariantId": variant_id, "currency": "USD",
                "productionCurrency": "USD", "sellingRegionName": "worldwide",
                "variant": {"id": variant_id, "techniques": [{
                    "techniqueKey": "dtg", "techniqueDisplayName": "DTG printing",
                    "price": "12.50", "discountedPrice": "11.25"}]},
                "product": {"id": 71},
                "placements": []}

    async def catalog_product_prices(self, product_id):
        return {"catalogProductId": product_id, "currency": "USD",
                "productionCurrency": "USD", "sellingRegionName": "worldwide",
                "product": {"id": product_id}, "placements": [], "variants": []}

    async def mockup_styles(self, template_id):
        return {"templateId": template_id, "styles": [
            {"id": 3, "placement": "front", "category": "Ghost",
             "view": "Front", "variantIds": []}]}

    async def mockup_plan(self, template_id, variant_ids=None, style_ids=None):
        self.last_plan_selection = (variant_ids, style_ids)
        return {"templateId": template_id, "product": {"id": 71, "name": "AW26 Tee"},
                "selectedRepresentativeVariants": [{"id": 4016, "color": "Black", "size": "M"}],
                "colors": ["Black"], "templatePlacements": ["front"],
                "supportedStylesByPlacement": {"front": [
                    {"id": 3, "category": "Ghost", "view": "Front",
                     "restrictedVariantIds": []}]},
                "recommendedCandidateStylesByPlacement": {"front": [
                    {"id": 3, "category": "Ghost", "view": "Front",
                     "restrictedVariantIds": []}]},
                "plannedMockupStyleIds": [3], "estimatedGeneratedFiles": 1,
                "plannedTaskCount": 1, "placements": ["front"],
                "requestedStyles": [{"id": 3, "placement": "front", "view": "Front",
                                     "category": "Ghost", "restrictedVariantIds": []}],
                "estimatedTaskCount": 1}

    async def create_mockup_task(self, template_id, variant_ids, style_ids):
        self.created += 1
        return {"templateId": template_id, "taskIds": [101]}

    async def mockup_task(self, task_id):
        return {"id": task_id, "status": "completed", "failed": False,
                "mockups": [{"url": "https://example.invalid/front.jpg",
                             "variantId": 4016, "placement": "front",
                             "view": "Front", "styleId": 3,
                             "technique": "dtg", "dimensions": None}]}


@pytest.mark.parametrize("path", [
    "/api/operator/v1/printful/status",
    "/api/operator/v1/printful/scopes",
    "/api/operator/v1/printful/templates",
    "/api/operator/v1/printful/templates/12",
    "/api/operator/v1/printful/sync-products",
    "/api/operator/v1/printful/sync-products/99",
    "/api/operator/v1/printful/orders",
    "/api/operator/v1/printful/orders/99",
    "/api/operator/v1/printful/catalog-variants/4016/prices",
    "/api/operator/v1/printful/catalog-products/71/prices",
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
    assert run(request("POST", "/api/operator/v1/printful/orders")).status_code == 405
    assert run(request("PATCH", "/api/operator/v1/printful/orders/1")).status_code == 405
    assert run(request("POST", "/api/operator/v1/printful/catalog-variants/4016/prices")).status_code == 405
    assert run(request("PATCH", "/api/operator/v1/printful/catalog-products/71/prices")).status_code == 405
    assert os.getenv("OPERATOR_WRITES_ENABLED") == "false"


def test_printful_order_normalization_excludes_recipient_and_tracks_hold_state():
    raw = {
        "id": 900, "external_id": "4180", "status": "draft",
        "created": 1791155888, "updated": 1791155900,
        "recipient": {"name": "Private Buyer", "email": "private@example.test",
                      "address1": "Private street"},
        "retail_costs": {"currency": "USD", "subtotal": "32.00",
                         "shipping": "4.69", "total": "36.69"},
        "items": [{"id": 1, "external_id": "line-1", "variant_id": 16178,
                   "external_variant_id": "3915", "quantity": 1,
                   "name": "Lockmark Ribbed Beanie", "files": [{"url": "private"}]}],
        "shipments": [],
    }
    result = normalize_printful_order(raw)
    serialized = str(result)
    assert result["manual_confirm_required"] is True
    assert result["production_started"] is False
    assert result["fulfillment_confirmed"] is False
    assert "Private Buyer" not in serialized
    assert "private@example" not in serialized
    assert "Private street" not in serialized


def test_printful_scope_names_are_read_only_and_do_not_expose_token(monkeypatch):
    monkeypatch.setenv("PRINTFUL_API_TOKEN", TOKEN)

    def handler(request):
        assert request.method == "GET"
        assert request.url.path == "/oauth/scopes"
        return httpx.Response(200, json={"code": 200, "result": {"scopes": [
            {"scope": "orders/read", "display_name": "View all orders"},
            {"scope": "sync_products/read", "display_name": "View products"},
        ]}})

    result = run(client_for(handler).scopes())
    assert result == {"scopes": ["orders/read", "sync_products/read"], "orders_read": True}
    assert TOKEN not in str(result)


def test_printful_orders_use_get_store_scope_and_support_external_lookup(monkeypatch):
    monkeypatch.setenv("PRINTFUL_API_TOKEN", TOKEN)
    monkeypatch.setenv("PRINTFUL_STORE_ID", "321")
    requests = []
    order = {"id": 900, "external_id": "4180", "status": "draft",
             "items": [], "shipments": [], "retail_costs": {"currency": "USD"}}

    def handler(request):
        requests.append(request)
        assert request.method == "GET"
        assert request.headers["X-PF-Store-Id"] == "321"
        if request.url.path == "/orders":
            return httpx.Response(200, json={"code": 200, "result": [order],
                                             "paging": {"total": 1, "limit": 20, "offset": 0}})
        assert request.url.path == "/orders/@4180"
        return httpx.Response(200, json={"code": 200, "result": order})

    client = client_for(handler)
    listed = run(client.orders(20, 0, "draft"))
    found = run(client.orders(20, 0, external_id="4180"))
    detail = run(client.order("@4180"))
    assert listed["items"][0]["printful_order_id"] == 900
    assert found["total"] == 1
    assert detail["external_id"] == "4180"
    assert requests[0].url.params["status"] == "draft"
    assert TOKEN not in str(listed) + str(found) + str(detail)


def test_printful_orders_retry_without_store_header_for_single_store_token(monkeypatch):
    monkeypatch.setenv("PRINTFUL_API_TOKEN", TOKEN)
    monkeypatch.setenv("PRINTFUL_STORE_ID", "321")
    requests = []

    def handler(request):
        requests.append(request)
        assert request.method == "GET"
        if request.headers.get("X-PF-Store-Id"):
            return httpx.Response(403, json={"error": {"message": TOKEN}})
        return httpx.Response(200, json={"code": 200, "result": [],
                                         "paging": {"total": 0, "limit": 1, "offset": 0}})

    result = run(client_for(handler).orders(1, 0))
    assert result["total"] == 0
    assert len(requests) == 2
    assert requests[0].headers["X-PF-Store-Id"] == "321"
    assert "X-PF-Store-Id" not in requests[1].headers
    assert TOKEN not in str(result)


def test_catalog_variant_prices_use_official_read_only_endpoint(monkeypatch):
    monkeypatch.setenv("PRINTFUL_API_TOKEN", TOKEN)
    requests = []

    def handler(request):
        requests.append(request)
        return httpx.Response(200, json={"data": {
            "currency": "USD", "production_currency": "USD",
            "variant": {"id": 4016, "techniques": [{
                "technique_key": "dtg", "technique_display_name": "DTG printing",
                "price": "14.50", "discounted_price": "13.05"}]},
            "product": {"id": 71, "name": "Unisex tee", "placements": [{
                "id": "front", "title": "Front", "type": "Printing",
                "technique_key": "dtg", "price": "0.00", "discounted_price": "0.00",
                "placement_options": [], "layers": [{
                    "type": "file", "additional_price": "1.25", "layer_options": []}]}]},
        }})

    result = run(client_for(handler).catalog_variant_prices(4016))
    assert len(requests) == 1
    assert requests[0].method == "GET"
    assert requests[0].url.path == "/v2/catalog-variants/4016/prices"
    assert dict(requests[0].url.params) == {
        "currency": "USD", "selling_region_name": "worldwide"}
    assert result == {
        "catalogVariantId": 4016, "currency": "USD", "productionCurrency": "USD",
        "sellingRegionName": "worldwide",
        "variant": {"id": 4016, "techniques": [{
            "techniqueKey": "dtg", "techniqueDisplayName": "DTG printing",
            "price": "14.50", "discountedPrice": "13.05"}]},
        "product": {"id": 71},
        "placements": [{"id": "front", "title": "Front", "type": "Printing",
                        "techniqueKey": "dtg", "price": "0.00",
                        "discountedPrice": "0.00", "placementOptions": [],
                        "layers": [{"type": "file", "additionalPrice": "1.25",
                                    "layerOptions": []}]}],
    }


def test_catalog_variant_price_route_is_authenticated_and_sanitizes_scope_failure(monkeypatch):
    monkeypatch.setenv("PRINTFUL_API_TOKEN", TOKEN)
    monkeypatch.setenv("OPERATOR_API_TOKEN", "o" * 32)

    def handler(_request):
        return httpx.Response(403, json={"message": "missing scope " + TOKEN})

    app = FastAPI()
    app.include_router(create_router(Store(), printful=client_for(handler)))

    async def request(headers=None):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),
                                     base_url="http://test") as client:
            return await client.get(
                "/api/operator/v1/printful/catalog-variants/4016/prices", headers=headers)

    assert run(request()).status_code == 401
    response = run(request({"Authorization": "Bearer " + "o" * 32}))
    assert response.status_code == 502
    assert response.json() == {"error": "PRINTFUL_FORBIDDEN"}
    assert TOKEN not in response.text


def test_catalog_product_prices_batch_variants_in_one_get(monkeypatch):
    monkeypatch.setenv("PRINTFUL_API_TOKEN", TOKEN)
    requests = []

    def handler(request):
        requests.append(request)
        return httpx.Response(200, json={
            "data": {"currency": "USD", "product": {"id": 71, "placements": []},
                     "variants": [
                         {"id": 4016, "techniques": [{
                             "technique_key": "dtg", "technique_display_name": "DTG",
                             "price": "12.50", "discounted_price": "11.25"}]},
                         {"id": 4017, "techniques": [{
                             "technique_key": "dtg", "technique_display_name": "DTG",
                             "price": "14.00", "discounted_price": "12.60"}]}]},
            "paging": {"total": 2, "limit": 100, "offset": 0}})

    result = run(client_for(handler).catalog_product_prices(71))
    assert len(requests) == 1
    assert requests[0].method == "GET"
    assert requests[0].url.path == "/v2/catalog-products/71/prices"
    assert [variant["id"] for variant in result["variants"]] == [4016, 4017]
    assert result["variants"][1]["techniques"][0]["price"] == "14.00"


def test_aw26_allowlist_has_exactly_seventeen_templates():
    assert AW26_TEMPLATE_IDS == frozenset({
        79403270, 100892117, 105623495, 105624073, 106094567, 106357278,
        106357334, 106766446, 106767107, 107221423, 107530836, 107563422,
        107563824, 107564276, 107658409, 107660830, 107660910,
    })
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
            template = template_payload()
            template["placements"] = [
                {"placement": "front"}, {"placement": "back"},
                {"placement": "sleeve_left"},
            ]
            return httpx.Response(200, json={"code": 200, "result": template})
        if request.url.path.endswith("/catalog-variants"):
            return httpx.Response(200, json={"data": [
                {"id": 4016, "color": "Black", "size": "M"},
                {"id": 4017, "color": "White", "size": "S"},
            ], "paging": {"total": 2}})
        if request.url.path.endswith("/mockup-styles"):
            placement = request.url.params["placements"]
            groups = {
                "front": {"placement": "front", "display_name": "Front print", "mockup_styles": [
                    {"id": 2, "category_name": "Flat", "view_name": "Front",
                     "restricted_to_variants": None},
                    {"id": 3, "category_name": "Model", "view_name": "Front",
                     "restricted_to_variants": None}]},
                "back": {"placement": "back", "display_name": "Back print", "mockup_styles": [
                    {"id": 4, "category_name": "Model", "view_name": "Back",
                     "restricted_to_variants": [4016, 4017]}]},
                "sleeve_left": {"placement": "sleeve_left", "display_name": "Left sleeve",
                                "mockup_styles": [
                                    {"id": 5, "category_name": "Ghost", "view_name": "Sleeve detail",
                                     "restricted_to_variants": [4016]}]},
            }
            assert placement in groups
            return httpx.Response(200, json={
                "data": [groups[placement]], "paging": {"total": 1}})
        raise AssertionError(f"unexpected request: {request.url}")

    plan = run(client_for(handler).mockup_plan(12))
    assert plan["selectedRepresentativeVariants"] == [
        {"id": 4016, "color": "Black", "size": "M"},
        {"id": 4017, "color": "White", "size": "S"},
    ]
    assert plan["templatePlacements"] == ["front", "back", "sleeve_left"]
    assert list(plan["supportedStylesByPlacement"]) == ["front", "back", "sleeve_left"]
    assert [style["id"] for style in plan["supportedStylesByPlacement"]["front"]] == [2, 3]
    assert [style["id"] for style in plan["recommendedCandidateStylesByPlacement"]["front"]] == [3, 2]
    assert plan["plannedMockupStyleIds"] == [3, 2, 4, 5]
    assert plan["estimatedGeneratedFiles"] == 7
    assert plan["plannedTaskCount"] == 2
    assert plan["estimatedTaskCount"] == 2
    assert all(request.method == "GET" for request in requests)
    style_requests = [request for request in requests
                      if request.url.path.endswith("/mockup-styles")]
    assert [request.url.params["placements"] for request in style_requests] == [
        "front", "back", "sleeve_left"]

    selected = run(client_for(handler).mockup_plan(12, [4016], [4, 5]))
    assert selected["selectedRepresentativeVariants"] == [
        {"id": 4016, "color": "Black", "size": "M"}]
    assert selected["plannedMockupStyleIds"] == [4, 5]
    assert [style["id"] for style in selected["requestedStyles"]] == [4, 5]
    assert selected["estimatedGeneratedFiles"] == 2
    assert selected["plannedTaskCount"] == 1


def test_shared_style_ids_remain_grouped_but_are_planned_once(monkeypatch):
    monkeypatch.setenv("PRINTFUL_API_TOKEN", TOKEN)

    def handler(request):
        if request.url.path == "/product-templates/12":
            template = template_payload()
            template["placements"] = [{"placement": "front"}, {"placement": "back"}]
            template["available_variant_ids"] = [4016]
            return httpx.Response(200, json={"code": 200, "result": template})
        if request.url.path.endswith("/catalog-variants"):
            return httpx.Response(200, json={"data": [
                {"id": 4016, "color": "Black", "size": "M"}],
                "paging": {"total": 1}})
        if request.url.path.endswith("/mockup-styles"):
            placement = request.url.params["placements"]
            return httpx.Response(200, json={"data": [{
                "placement": placement,
                "mockup_styles": [{
                    "id": 9,
                    "category_name": "Model",
                    "view_name": "Editorial",
                    "restricted_to_variants": None,
                }],
            }], "paging": {"total": 1}})
        raise AssertionError(f"unexpected request: {request.url}")

    plan = run(client_for(handler).mockup_plan(12))
    assert [style["id"] for style in plan["supportedStylesByPlacement"]["front"]] == [9]
    assert [style["id"] for style in plan["supportedStylesByPlacement"]["back"]] == [9]
    assert plan["plannedMockupStyleIds"] == [9]
    assert plan["requestedStyles"][0]["placements"] == ["front", "back"]
    assert plan["estimatedGeneratedFiles"] == 2
    assert plan["plannedTaskCount"] == 1


def test_front_only_template_does_not_expose_unconfigured_placements():
    styles = [
        {"id": 1, "placement": "front", "category": "Ghost", "view": "Front",
         "variantIds": []},
        {"id": 2, "placement": "back", "category": "Ghost", "view": "Back",
         "variantIds": []},
    ]
    grouped = group_styles_by_placement(styles, ["front"])
    assert list(grouped) == ["front"]
    assert [style["id"] for style in grouped["front"]] == [1]


def test_embroidery_placement_is_preserved_without_inventing_styles():
    styles = [{"id": 9, "placement": "embroidery_front", "category": "Model",
               "view": "Embroidery detail", "variantIds": [80]}]
    grouped = group_styles_by_placement(styles, ["embroidery_front", "embroidery_back"])
    assert grouped["embroidery_front"][0]["restrictedVariantIds"] == [80]
    assert grouped["embroidery_back"] == []


def test_restricted_styles_are_reported_and_batched_by_compatible_variants():
    grouped = {"front": [
        {"id": 1, "category": "Model", "view": "Front", "restrictedVariantIds": []},
        {"id": 2, "category": "Ghost", "view": "Front", "restrictedVariantIds": [10]},
        {"id": 3, "category": "Flat", "view": "Front", "restrictedVariantIds": [99]},
    ]}
    variants = [{"id": 10, "color": "Black", "size": "M"},
                {"id": 11, "color": "White", "size": "M"}]
    recommended = recommend_styles_by_placement(grouped, variants)
    assert [style["id"] for style in recommended["front"]] == [1, 2]
    assert recommended["front"][1]["restrictedVariantIds"] == [10]
    assert plan_mockup_batches(variants, recommended["front"]) == [
        {"variantIds": [10, 11], "styleIds": [1]},
        {"variantIds": [10], "styleIds": [2]},
    ]


def test_dry_run_is_authenticated_allowlisted_and_never_generates(monkeypatch):
    monkeypatch.setenv("OPERATOR_API_TOKEN", "o" * 32)
    monkeypatch.setenv("OPERATOR_WRITES_ENABLED", "false")
    monkeypatch.delenv("PRINTFUL_MOCKUP_GENERATION_ENABLED", raising=False)
    store, printful = Store(), Printful()
    app = FastAPI()
    app.include_router(create_router(store, printful=printful))

    async def post(template_id, authenticated=True, body=None):
        headers = {"Authorization": "Bearer " + "o" * 32} if authenticated else {}
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),
                                     base_url="http://test") as client:
            kwargs = {"json": body} if body is not None else {}
            return await client.post(
                f"/api/operator/v1/printful/templates/{template_id}/mockup-tasks/dry-run",
                headers=headers, **kwargs)

    assert run(post(TEST_TEMPLATE_ID, False)).status_code == 401
    denied = run(post(12))
    assert denied.status_code == 403
    assert denied.json() == {"error": "TEMPLATE_NOT_ALLOWED"}
    response = run(post(TEST_TEMPLATE_ID))
    assert response.status_code == 200
    assert response.json()["planId"] == PLAN_ID
    assert response.json()["templatePlacements"] == ["front"]
    assert response.json()["plannedMockupStyleIds"] == [3]
    assert response.json()["estimatedGeneratedFiles"] == 1
    assert response.json()["plannedTaskCount"] == 1
    assert response.json()["estimatedTaskCount"] == 1
    selected = run(post(TEST_TEMPLATE_ID, body={
        "variantIds": [4016], "styleIds": [3]}))
    assert selected.status_code == 200
    assert printful.last_plan_selection == ([4016], [3])
    invalid = run(post(TEST_TEMPLATE_ID, body={"variantIds": [4016], "styleIds": [3, 3]}))
    assert invalid.status_code == 400
    assert invalid.json() == {"error": "INVALID_MOCKUP_SELECTION"}
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
            assert json.loads(request.content) == {
                "format": "jpg",
                "products": [{
                    "source": "product_template",
                    "product_template_id": 12,
                    "catalog_variant_ids": [4016],
                    "mockup_style_ids": [3],
                }],
            }
            return httpx.Response(200, json={"data": [{"id": 987, "status": "pending"}]})
        assert request.headers["X-PF-Store-Id"] == "321"
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


def pilot_context():
    return {
        "template_id": 105623495,
        "variants": [{"id": 23054, "color": "Black", "size": "M"}],
        "styles": [{"id": style_id} for style_id in [26780, 26784, 27316, 27317, 27318]],
    }


def pilot_supported_styles():
    return [
        {"id": 26780, "placement": "front", "category": "Ghost", "view": "Front"},
        {"id": 26783, "placement": "back", "category": "Ghost", "view": "Back"},
        {"id": 26784, "placement": "front", "category": "Ghost", "view": "Left"},
        {"id": 27316, "placement": "front", "category": "Men's", "view": "Front"},
        {"id": 27317, "placement": "back", "category": "Men's", "view": "Back"},
        {"id": 27318, "placement": "front", "category": "Men's", "view": "Left Front"},
    ]


def pilot_task(style_ids=None, variant_id=23054, template_id=None):
    style_ids = style_ids or [26780, 26784, 27316, 27317, 27318]
    result = {
        "id": 975313568,
        "status": "completed",
        "failed": False,
        "mockups": [{
            "url": f"https://example.invalid/{style_id}.jpg",
            "variantId": variant_id,
            # Printful reports the design placement here, not the photographed view.
            "placement": "front",
            "styleId": style_id,
            "technique": "dtg",
            "dimensions": None,
        } for style_id in style_ids],
    }
    if template_id is not None:
        result["templateId"] = template_id
    return result


def normalize_pilot(raw):
    return normalize_mockup_task_result(
        raw, 975313568, pilot_context(), pilot_supported_styles())


def test_mockup_result_exact_requested_styles_passes():
    result = normalize_pilot(pilot_task())
    assert result["resultStatus"] == "PASS"
    assert result["requestedStylesPresent"] is True
    assert result["extraStyleIds"] == []


def test_mockup_result_valid_upstream_extra_passes_with_extra_output():
    result = normalize_pilot(pilot_task(
        [26780, 26783, 26784, 27316, 27317, 27318]))
    assert result["resultStatus"] == "PASS_WITH_EXTRA_OUTPUT"
    assert result["requestedStylesPresent"] is True
    assert result["extraStyleIds"] == [26783]
    extra = next(item for item in result["mockups"]
                 if item["mockupStyleId"] == 26783)
    assert extra["extraUpstreamOutput"] is True


def test_mockup_result_missing_requested_style_fails():
    result = normalize_pilot(pilot_task([26780, 26784, 27316, 27317]))
    assert result["resultStatus"] == "FAIL"
    assert result["requestedStylesPresent"] is False
    assert result["missingStyleIds"] == [27318]


def test_mockup_result_unsupported_extra_style_fails():
    result = normalize_pilot(pilot_task(
        [26780, 26784, 27316, 27317, 27318, 99999]))
    assert result["resultStatus"] == "FAIL"
    assert "UNSUPPORTED_EXTRA_STYLE" in result["validationErrors"]


def test_mockup_result_wrong_variant_fails():
    result = normalize_pilot(pilot_task(variant_id=99999))
    assert result["resultStatus"] == "FAIL"
    assert "WRONG_VARIANT" in result["validationErrors"]


def test_mockup_result_wrong_template_fails():
    result = normalize_pilot(pilot_task(template_id=99999))
    assert result["resultStatus"] == "FAIL"
    assert "WRONG_TEMPLATE" in result["validationErrors"]


def test_mockup_result_resolves_view_metadata_separately_from_design_placement():
    result = normalize_pilot(pilot_task(
        [26780, 26783, 26784, 27316, 27317, 27318]))
    expected = {
        26783: ("Ghost", "Back"),
        26784: ("Ghost", "Left"),
        27317: ("Men's", "Back"),
        27318: ("Men's", "Left Front"),
    }
    for item in result["mockups"]:
        if item["mockupStyleId"] in expected:
            assert (item["mockupStyleName"], item["mockupViewName"]) == expected[
                item["mockupStyleId"]]
            assert item["designPlacement"] == "front"


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


def test_printful_validation_details_are_allowlisted_and_secrets_redacted(monkeypatch):
    monkeypatch.setenv("PRINTFUL_API_TOKEN", TOKEN)
    response = httpx.Response(400, json={"error": {"errors": [{
        "type": "validation_error",
        "title": "Invalid request",
        "detail": "Unsupported style",
        "source": {"pointer": "/products/0/mockup_style_ids", "secret": TOKEN},
        "valid_values": [1, 2],
        "debug": TOKEN,
    }, {
        "detail": "Bearer " + TOKEN,
    }]}})
    assert sanitize_printful_validation(response) == [{
        "type": "validation_error",
        "title": "Invalid request",
        "detail": "Unsupported style",
        "source": {"pointer": "/products/0/mockup_style_ids"},
        "valid_values": [1, 2],
    }, {"detail": "[REDACTED]"}]


def test_exact_product_template_mockup_request_body():
    assert build_mockup_request_body(106357278, [23054], [27318]) == {
        "format": "jpg",
        "products": [{
            "source": "product_template",
            "product_template_id": 106357278,
            "catalog_variant_ids": [23054],
            "mockup_style_ids": [27318],
        }],
    }


def test_mockup_generation_validation_details_are_sanitized(monkeypatch):
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
        return httpx.Response(400, json={"error": {"errors": [{
            "type": "validation_error",
            "title": "Invalid request",
            "detail": "The selected mockup style is not compatible",
            "source": {"pointer": "/products/0/mockup_style_ids"},
        }]}})

    with pytest.raises(OperatorError) as error:
        run(client_for(handler).create_mockup_task(12, [4016], [3]))

    assert error.value.details == {
        "status": 400,
        "outboundBody": {
            "format": "jpg",
            "products": [{
                "source": "product_template",
                "product_template_id": 12,
                "catalog_variant_ids": [4016],
                "mockup_style_ids": [3],
            }],
        },
        "issues": [{
            "type": "validation_error",
            "title": "Invalid request",
            "detail": "The selected mockup style is not compatible",
            "source": {"pointer": "/products/0/mockup_style_ids"},
        }],
    }


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
