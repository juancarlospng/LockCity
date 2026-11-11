import asyncio
import copy

import pytest
from pydantic import ValidationError

from operator_audit import AuditEventError, AuditEvents
from operator_orders import AdminOrderCreate, AdminOrderEmail, AdminOrderService


class MemoryAuditStore:
    def __init__(self):
        self.records = {}

    async def find_internal(self, key_hash):
        return self.records.get(key_hash)

    async def reserve(self, key_hash, record):
        if key_hash in self.records:
            return False
        self.records[key_hash] = {
            **copy.deepcopy(record), "idempotency_key_hash": key_hash,
            "state": "reserved", "result": None,
        }
        return True

    async def update(self, key_hash, fields):
        self.records[key_hash].update(copy.deepcopy(fields))

    async def list(self, page, size):
        return list(self.records.values())[(page - 1) * size:page * size]


class WooFailure(Exception):
    def __init__(self, status, code):
        self.status, self.code = status, code


class Woo:
    def __init__(self):
        self.product = {
            "id": 4067, "type": "variable", "status": "publish",
            "selected_variation": {
                "id": 4070, "parent_id": 4067, "status": "publish",
                "stock_status": "instock", "manage_stock": False, "price": "79.00",
            },
        }
        self.created = 0
        self.read_after_write = 0
        self.email_sent = 0
        self.fail_create = False

    async def read_product_for_order(self, product_id, variation_id):
        if product_id != 4067:
            raise WooFailure(404, "PRODUCT_NOT_FOUND")
        return copy.deepcopy(self.product)

    async def create_operator_order(self, payload):
        self.created += 1
        if self.fail_create:
            raise WooFailure(502, "WOOCOMMERCE_UNAVAILABLE")
        return {"order_id": 5001}

    async def order(self, order_id):
        self.read_after_write += 1
        return {
            "order_id": order_id, "status": "on-hold", "currency": "USD",
            "total": "89.00", "payment_captured": False,
            "transaction_id_present": False,
            "line_items": [{"product_id": 4067, "variation_id": 4070, "quantity": 1}],
        }

    async def send_operator_order_email(self, order_id, payload):
        self.email_sent += 1
        return {"sent": True}


def order_payload(**changes):
    address = {
        "first_name": "Ada", "last_name": "Lovelace", "company": "",
        "address_1": "1 Test Street", "address_2": "", "city": "London",
        "state": "", "postcode": "SW1A 1AA", "country": "GB",
    }
    payload = {
        "status": "on-hold",
        "line_items": [{"product_id": 4067, "variation_id": 4070, "quantity": 1}],
        "billing": {**address, "email": "buyer@example.com", "phone": "+44123456789"},
        "shipping": address,
        "shipping_method": "flat_rate:1", "reason": "Manual support order",
        "idempotency_key": "operator-order-key-0001",
    }
    payload.update(changes)
    return payload


def run(coroutine):
    return asyncio.run(coroutine)


def test_create_read_after_write_and_idempotent_replay():
    woo, store = Woo(), MemoryAuditStore()
    service = AdminOrderService(woo, AuditEvents(store))
    first = run(service.create(AdminOrderCreate.model_validate(order_payload()), "operator"))
    second = run(service.create(AdminOrderCreate.model_validate(order_payload()), "operator"))
    assert first[0] == 201 and second[0] == 201
    assert woo.created == 1 and woo.read_after_write == 1
    assert first[1]["order_id"] == 5001
    assert first[1]["replayed"] is False and second[1]["replayed"] is True


def test_same_key_different_payload_is_409():
    woo, store = Woo(), MemoryAuditStore()
    service = AdminOrderService(woo, AuditEvents(store))
    run(service.create(AdminOrderCreate.model_validate(order_payload()), "operator"))
    changed = order_payload(status="pending")
    with pytest.raises(AuditEventError) as error:
        run(service.create(AdminOrderCreate.model_validate(changed), "operator"))
    assert error.value.status == 409


def test_missing_product_is_failed_before_write():
    woo, store = Woo(), MemoryAuditStore()
    service = AdminOrderService(woo, AuditEvents(store))
    payload = order_payload()
    payload["line_items"][0]["product_id"] = 9999
    with pytest.raises(AuditEventError) as error:
        run(service.create(AdminOrderCreate.model_validate(payload), "operator"))
    assert error.value.code == "PRODUCT_NOT_FOUND"
    assert woo.created == 0
    assert next(iter(store.records.values()))["state"] == "failed"


def test_variation_parent_mismatch():
    woo, store = Woo(), MemoryAuditStore()
    woo.product["selected_variation"]["parent_id"] = 9999
    with pytest.raises(AuditEventError) as error:
        run(AdminOrderService(woo, AuditEvents(store)).create(
            AdminOrderCreate.model_validate(order_payload()), "operator"))
    assert error.value.code == "VARIATION_PARENT_MISMATCH"
    assert woo.created == 0


@pytest.mark.parametrize("forbidden", [
    {"price": "1.00"}, {"total": "1.00"}, {"set_paid": True},
    {"transaction_id": "fake"}, {"card_number": "4111111111111111"},
])
def test_commercial_and_card_fields_are_rejected(forbidden):
    with pytest.raises(ValidationError):
        AdminOrderCreate.model_validate({**order_payload(), **forbidden})


def test_woo_timeout_after_write_is_uncertain():
    woo, store = Woo(), MemoryAuditStore()
    woo.fail_create = True
    with pytest.raises(AuditEventError) as error:
        run(AdminOrderService(woo, AuditEvents(store)).create(
            AdminOrderCreate.model_validate(order_payload()), "operator"))
    assert error.value.code == "OPERATION_UNCERTAIN"
    assert next(iter(store.records.values()))["state"] == "uncertain"


def test_email_retry_replays_without_second_send():
    woo, store = Woo(), MemoryAuditStore()
    service = AdminOrderService(woo, AuditEvents(store))
    body = AdminOrderEmail.model_validate({
        "template": "customer_invoice", "reason": "Resend requested by support",
        "idempotency_key": "operator-email-key-0001",
    })
    first = run(service.email(5001, body, "operator"))
    second = run(service.email(5001, body, "operator"))
    assert first[1]["sent"] is True and second[1]["sent"] is True
    assert second[1]["replayed"] is True
    assert woo.email_sent == 1


def test_arbitrary_recipient_subject_and_html_are_rejected():
    base = {"template": "customer_invoice", "reason": "Support request",
            "idempotency_key": "operator-email-key-0002"}
    for field, value in (("recipient", "other@example.com"),
                         ("subject", "Custom"), ("html", "<b>custom</b>")):
        with pytest.raises(ValidationError):
            AdminOrderEmail.model_validate({**base, field: value})
