import asyncio

import httpx
import pytest
from fastapi import FastAPI

import operator_api
from operator_api import OperatorError, create_router, shipping_estimate_view


TOKEN = "s" * 32


class Store:
    async def ping(self):
        pass


def destination(country="CH", state="", postcode="8001", city="Zürich"):
    return {
        "country": country,
        "state": state,
        "postcode": postcode,
        "city": city,
        "address_1": "Museumstrasse 1",
    }


def request_body(variation_id=None, selected_destination=None):
    return {
        "product_id": 3745,
        "variation_id": variation_id,
        "quantity": 1,
        "destination": selected_destination or destination(),
    }


def response_body(payload, options=None):
    options = options or [{
        "method_id": "flat_rate:2",
        "label": "Flat rate",
        "cost": "10.00",
        "tax": "0.00",
        "total": "10.00",
    }]
    selected = min(options, key=lambda item: float(item["total"]))
    return {
        "product_id": payload["product_id"],
        "variation_id": payload["variation_id"],
        "quantity": payload["quantity"],
        "currency": "USD",
        "product_price": "27.09",
        "destination": {
            key: payload["destination"][key]
            for key in ("country", "state", "postcode", "city")
        },
        "shipping_options": options,
        "selected_or_cheapest_shipping": selected,
    }


class Woo:
    def __init__(self):
        self.calls = []
        self.error = None
        self.options = None
        self.order_writes = 0
        self.product_writes = 0

    async def estimate_shipping(self, payload):
        self.calls.append(payload)
        if self.error is not None:
            raise self.error
        return shipping_estimate_view(response_body(payload, self.options), payload)


@pytest.fixture
def setup(monkeypatch):
    monkeypatch.setenv("OPERATOR_API_TOKEN", TOKEN)
    operator_api._estimate_requests.clear()
    woo = Woo()
    app = FastAPI()
    app.include_router(create_router(Store(), woo=woo))
    return app, woo


def call(setup, body, headers=None):
    async def run():
        async with httpx.AsyncClient(
                transport=httpx.ASGITransport(app=setup[0]),
                base_url="http://test") as client:
            return await client.post(
                "/api/operator/v1/woocommerce/estimate-shipping",
                json=body,
                headers=headers if headers is not None else {
                    "Authorization": "Bearer " + TOKEN})
    return asyncio.run(run())


def test_simple_product_shipping_is_read_only(setup):
    result = call(setup, request_body())
    assert result.status_code == 200
    assert result.json()["product_price"] == "27.09"
    assert result.json()["selected_or_cheapest_shipping"]["method_id"] == "flat_rate:2"
    assert setup[1].calls == [request_body()]
    assert setup[1].order_writes == 0
    assert setup[1].product_writes == 0


def test_variable_product_is_forwarded_without_commercial_fields(setup):
    body = request_body(variation_id=4070)
    result = call(setup, body)
    assert result.status_code == 200
    assert result.json()["variation_id"] == 4070
    assert setup[1].calls[0] == body


@pytest.mark.parametrize("field,value", [
    ("price", "1.00"),
    ("subtotal", "1.00"),
    ("total", "1.00"),
    ("tax", "0.00"),
    ("shipping_cost", "0.00"),
    ("payment_method", "card"),
    ("transaction_id", "secret"),
    ("set_paid", True),
])
def test_commercial_and_payment_fields_are_rejected(setup, field, value):
    body = request_body()
    body[field] = value
    result = call(setup, body)
    assert result.status_code == 400
    assert result.json() == {"error": "INVALID_SHIPPING_ESTIMATE"}
    assert setup[1].calls == []


@pytest.mark.parametrize("error,status", [
    ("VARIATION_MISMATCH", 409),
    ("PRODUCT_NOT_PURCHASABLE", 409),
    ("PRODUCT_NOT_FOUND", 404),
    ("INVALID_SHIPPING_ESTIMATE", 400),
    ("SHIPPING_UNAVAILABLE", 409),
])
def test_bridge_validation_errors_are_sanitized(setup, error, status):
    setup[1].error = OperatorError(status, error)
    result = call(setup, request_body())
    assert result.status_code == status
    assert result.json() == {"error": error}


def test_multiple_shipping_methods_and_tax_are_normalized(setup):
    setup[1].options = [
        {"method_id": "flat_rate:2", "label": "Standard", "cost": "10",
         "tax": "0", "total": "10"},
        {"method_id": "flat_rate:3", "label": "Express", "cost": "12",
         "tax": "1.20", "total": "13.20"},
    ]
    result = call(setup, request_body())
    assert result.status_code == 200
    payload = result.json()
    assert payload["shipping_options"] == [
        {"method_id": "flat_rate:2", "label": "Standard", "cost": "10.00",
         "tax": "0.00", "total": "10.00"},
        {"method_id": "flat_rate:3", "label": "Express", "cost": "12.00",
         "tax": "1.20", "total": "13.20"},
    ]
    assert payload["selected_or_cheapest_shipping"]["method_id"] == "flat_rate:2"


@pytest.mark.parametrize("selected_destination", [
    destination(country="Switzerland"),
    destination(postcode=""),
    destination(city=""),
])
def test_invalid_destination_schema_is_rejected_before_woo(setup, selected_destination):
    result = call(setup, request_body(selected_destination=selected_destination))
    assert result.status_code == 400
    assert setup[1].calls == []


def test_authentication_and_rate_limit_apply(setup, monkeypatch):
    assert call(setup, request_body(), headers={}).status_code == 401
    monkeypatch.setattr(operator_api, "ESTIMATE_RATE_LIMIT", 1)
    assert call(setup, request_body()).status_code == 200
    limited = call(setup, request_body())
    assert limited.status_code == 429
    assert limited.json() == {"error": "ESTIMATE_RATE_LIMITED"}


def test_malformed_upstream_response_is_sanitized(setup):
    async def malformed(_payload):
        raise OperatorError(502, "INVALID_WOOCOMMERCE_RESPONSE")

    setup[1].estimate_shipping = malformed
    result = call(setup, request_body())
    assert result.status_code == 502
    assert result.json() == {"error": "INVALID_WOOCOMMERCE_RESPONSE"}
