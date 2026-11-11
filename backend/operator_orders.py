"""Audited administrative order commands. Woo remains the source of truth."""
from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, StrictInt, StrictStr

from operator_audit import AuditEventError, AuditEvents


class Address(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    first_name: StrictStr = Field(min_length=1, max_length=100)
    last_name: StrictStr = Field(min_length=1, max_length=100)
    company: StrictStr = Field(default="", max_length=200)
    address_1: StrictStr = Field(min_length=1, max_length=200)
    address_2: StrictStr = Field(default="", max_length=200)
    city: StrictStr = Field(min_length=1, max_length=100)
    state: StrictStr = Field(default="", max_length=100)
    postcode: StrictStr = Field(min_length=1, max_length=30)
    country: StrictStr = Field(pattern=r"^[A-Z]{2}$")


class BillingAddress(Address):
    email: StrictStr = Field(min_length=3, max_length=254)
    phone: StrictStr = Field(min_length=3, max_length=40)


class AdminLineItem(BaseModel):
    model_config = ConfigDict(extra="forbid")
    product_id: StrictInt = Field(gt=0, le=2147483647)
    variation_id: StrictInt = Field(default=0, ge=0, le=2147483647)
    quantity: StrictInt = Field(ge=1, le=20)


class AdminOrderCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    status: Literal["pending", "on-hold"]
    line_items: list[AdminLineItem] = Field(min_length=1, max_length=20)
    billing: BillingAddress
    shipping: Address
    shipping_method: StrictStr = Field(pattern=r"^[A-Za-z0-9_.:-]{1,100}$")
    reason: StrictStr = Field(min_length=3, max_length=500)
    idempotency_key: StrictStr = Field(pattern=r"^[A-Za-z0-9_-]{16,128}$")


class AdminOrderEmail(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    template: Literal[
        "customer_invoice", "customer_on_hold_order", "customer_processing_order"
    ]
    reason: StrictStr = Field(min_length=3, max_length=500)
    idempotency_key: StrictStr = Field(pattern=r"^[A-Za-z0-9_-]{16,128}$")


class AdminOrderService:
    def __init__(self, woo: Any, audit: AuditEvents):
        self.woo = woo
        self.audit = audit

    @staticmethod
    def _commercial_product(raw: dict[str, Any], requested: AdminLineItem) -> dict[str, Any]:
        if not isinstance(raw, dict) or raw.get("id") != requested.product_id:
            raise AuditEventError(502, "INVALID_UPSTREAM_RESPONSE")
        if raw.get("status") != "publish":
            raise AuditEventError(409, "PRODUCT_NOT_PURCHASABLE")
        selected = raw
        product_type = raw.get("type")
        variation = raw.get("selected_variation")
        if requested.variation_id:
            if (not isinstance(variation, dict)
                    or variation.get("id") != requested.variation_id
                    or variation.get("parent_id") != requested.product_id):
                raise AuditEventError(409, "VARIATION_PARENT_MISMATCH")
            selected = variation
        elif product_type == "variable":
            raise AuditEventError(409, "VARIATION_REQUIRED")
        if selected.get("status") not in (None, "publish"):
            raise AuditEventError(409, "PRODUCT_NOT_PURCHASABLE")
        if selected.get("stock_status") == "outofstock":
            raise AuditEventError(409, "PRODUCT_OUT_OF_STOCK")
        if selected.get("manage_stock") is True:
            quantity = selected.get("stock_quantity")
            if not isinstance(quantity, int) or quantity < requested.quantity:
                raise AuditEventError(409, "INSUFFICIENT_STOCK")
        try:
            price = Decimal(str(selected.get("price", "")))
        except (InvalidOperation, ValueError):
            raise AuditEventError(502, "INVALID_UPSTREAM_RESPONSE") from None
        if not price.is_finite() or price < 0:
            raise AuditEventError(502, "INVALID_UPSTREAM_RESPONSE")
        return {
            "product_id": requested.product_id,
            "variation_id": requested.variation_id,
            "quantity": requested.quantity,
            "validated_price": format(price.quantize(Decimal("0.01")), "f"),
            "stock_status": selected.get("stock_status", ""),
        }

    async def create(self, body: AdminOrderCreate, actor_id: str) -> tuple[int, dict[str, Any]]:
        fingerprint = body.model_dump()
        key_hash, operation_id, existing = await self.audit.reserve(
            idempotency_key=body.idempotency_key,
            fingerprint_payload=fingerprint,
            actor_id=actor_id,
            action="order.create",
            entity_type="order",
            entity_id=None,
            reason=body.reason,
        )
        if existing is not None:
            return self.audit.replay(existing)
        write_started = False
        try:
            validated = []
            for item in body.line_items:
                raw = await self.woo.read_product_for_order(
                    item.product_id, item.variation_id)
                validated.append(self._commercial_product(raw, item))
            await self.audit.mark(key_hash, "writing", before={
                "status": body.status,
                "line_items": validated,
                "shipping_method": body.shipping_method,
            })
            write_started = True
            bridge_payload = {
                "operation_id": operation_id,
                "status": body.status,
                "line_items": [item.model_dump() for item in body.line_items],
                "billing": body.billing.model_dump(),
                "shipping": body.shipping.model_dump(),
                "shipping_method": body.shipping_method,
            }
            created = await self.woo.create_operator_order(bridge_payload)
            order_id = created.get("order_id") if isinstance(created, dict) else None
            if not isinstance(order_id, int):
                raise AuditEventError(502, "INVALID_UPSTREAM_RESPONSE")
            verified = await self.woo.order(order_id)
            expected = sorted((item.product_id, item.variation_id, item.quantity)
                              for item in body.line_items)
            actual = sorted((item.get("product_id"), item.get("variation_id", 0),
                             int(item.get("quantity", 0)))
                            for item in verified.get("line_items", []))
            if (verified.get("order_id") != order_id
                    or verified.get("status") != body.status or actual != expected
                    or verified.get("payment_captured") is True
                    or verified.get("transaction_id_present") is True):
                raise AuditEventError(503, "ORDER_VERIFICATION_FAILED")
            result = {
                "operation_id": operation_id,
                "order_id": order_id,
                "status": verified["status"],
                "currency": verified.get("currency", ""),
                "total": verified.get("total", ""),
                "verified": True,
                "replayed": False,
            }
            await self.audit.mark(
                key_hash, "verified", entity_id=str(order_id),
                after={"order_id": order_id, "status": verified["status"],
                       "line_items": actual, "total": verified.get("total", "")},
                result=result, http_status=201)
            return 201, result
        except AuditEventError as exc:
            state = "uncertain" if write_started else "failed"
            result = {"error": exc.code, "operation_id": operation_id, "verified": False}
            await self.audit.mark(key_hash, state, result=result,
                                  http_status=exc.status, error_code=exc.code)
            raise AuditEventError(exc.status, exc.code, result) from None
        except Exception as exc:
            upstream_code = getattr(exc, "code", None)
            upstream_status = getattr(exc, "status", None)
            code = "OPERATION_UNCERTAIN" if write_started else (
                upstream_code if isinstance(upstream_code, str) else "ORDER_VALIDATION_FAILED")
            status = 503 if write_started else (
                upstream_status if isinstance(upstream_status, int) else 502)
            state = "uncertain" if write_started else "failed"
            result = {"error": code, "operation_id": operation_id, "verified": False}
            await self.audit.mark(key_hash, state, result=result,
                                  http_status=status, error_code=code)
            raise AuditEventError(status, code, result) from None

    async def email(
            self, order_id: int, body: AdminOrderEmail,
            actor_id: str) -> tuple[int, dict[str, Any]]:
        fingerprint = {"order_id": order_id, **body.model_dump()}
        key_hash, operation_id, existing = await self.audit.reserve(
            idempotency_key=body.idempotency_key,
            fingerprint_payload=fingerprint,
            actor_id=actor_id,
            action="order.email",
            entity_type="order",
            entity_id=str(order_id),
            reason=body.reason,
        )
        if existing is not None:
            return self.audit.replay(existing)
        write_started = False
        try:
            order = await self.woo.order(order_id)
            if order.get("order_id") != order_id:
                raise AuditEventError(502, "INVALID_UPSTREAM_RESPONSE")
            await self.audit.mark(key_hash, "writing", before={
                "order_id": order_id, "status": order.get("status"),
                "template": body.template,
            })
            write_started = True
            sent = await self.woo.send_operator_order_email(
                order_id, {"operation_id": operation_id, "template": body.template})
            if not isinstance(sent, dict) or sent.get("sent") is not True:
                raise AuditEventError(502, "EMAIL_SEND_FAILED")
            result = {"operation_id": operation_id, "order_id": order_id,
                      "template": body.template, "sent": True,
                      "verified": True, "replayed": False}
            await self.audit.mark(key_hash, "verified", after={
                "order_id": order_id, "template": body.template, "sent": True,
            }, result=result, http_status=200)
            return 200, result
        except AuditEventError as exc:
            state = "uncertain" if write_started else "failed"
            result = {"error": exc.code, "operation_id": operation_id,
                      "verified": False}
            await self.audit.mark(key_hash, state, result=result,
                                  http_status=exc.status, error_code=exc.code)
            raise AuditEventError(exc.status, exc.code, result) from None
        except Exception as exc:
            upstream_code = getattr(exc, "code", None)
            upstream_status = getattr(exc, "status", None)
            code = "OPERATION_UNCERTAIN" if write_started else (
                upstream_code if isinstance(upstream_code, str) else "ORDER_VALIDATION_FAILED")
            status = 503 if write_started else (
                upstream_status if isinstance(upstream_status, int) else 502)
            state = "uncertain" if write_started else "failed"
            result = {"error": code, "operation_id": operation_id, "verified": False}
            await self.audit.mark(key_hash, state, result=result,
                                  http_status=status, error_code=code)
            raise AuditEventError(status, code, result) from None
