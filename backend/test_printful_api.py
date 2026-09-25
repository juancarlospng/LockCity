import asyncio
import os

import httpx
import pytest
from fastapi import FastAPI

from operator_api import OperatorError, create_router
from printful_api import PrintfulClient, normalize_template_detail


TOKEN = "printful-test-token-that-must-never-leak"


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
    async def ping(self):
        return None

    async def audit(self, _page, _size):
        return []


class Printful:
    async def templates(self, _limit, _offset):
        return {"items": [], "limit": 1, "offset": 0, "total": 0}

    async def sync_products(self, _limit, _offset):
        return {"items": [], "limit": 1, "offset": 0, "total": 0}

    async def template(self, template_id):
        return {"id": template_id}

    async def sync_product(self, product_id):
        return {"syncProductId": product_id}


@pytest.mark.parametrize("path", [
    "/api/operator/v1/printful/status",
    "/api/operator/v1/printful/templates",
    "/api/operator/v1/printful/templates/12",
    "/api/operator/v1/printful/sync-products",
    "/api/operator/v1/printful/sync-products/99",
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
    assert run(request("GET", path, headers)).status_code == 200


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
