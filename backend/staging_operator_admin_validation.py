"""Reproducible, PII-minimized staging validation for Operator Admin MVP.

This utility never changes feature flags, never handles payment data and never
prints credentials, cookies, addresses, email addresses or phone numbers.
"""
from __future__ import annotations

import argparse
import copy
import getpass
import json
import os
import sys
import time
from pathlib import Path
from typing import Any

import httpx


FORBIDDEN_ORDER_FIELDS = {
    "price", "unit_price", "subtotal", "discount", "tax", "taxes", "total",
    "transaction_id", "set_paid", "card", "card_number", "cvv",
}
ALLOWED_EMAIL_FIELDS = {"template", "reason", "idempotency_key"}


class ValidationFailure(RuntimeError):
    pass


def require_environment() -> tuple[str, str, str]:
    base_url = os.getenv("OPERATOR_STAGING_URL", "").rstrip("/")
    origin = os.getenv("OPERATOR_ALLOWED_ORIGIN", "").rstrip("/")
    email = os.getenv("OPERATOR_ADMIN_EMAIL", "").strip()
    if not base_url.startswith("https://") or not origin.startswith("https://") or not email:
        raise ValidationFailure(
            "Set OPERATOR_STAGING_URL, OPERATOR_ALLOWED_ORIGIN and OPERATOR_ADMIN_EMAIL")
    return base_url, origin, email


def assert_status(response: httpx.Response, expected: int, label: str) -> None:
    if response.status_code != expected:
        code = None
        try:
            code = response.json().get("error")
        except Exception:
            pass
        raise ValidationFailure(
            f"{label}: expected HTTP {expected}, got {response.status_code} ({code or 'no code'})")


def login(client: httpx.Client, origin: str, email: str) -> str:
    password = getpass.getpass("Staging operator password (not echoed): ")
    response = client.post("/api/auth/login", headers={"Origin": origin}, json={
        "email": email, "password": password,
    })
    assert_status(response, 200, "login")
    payload = response.json()
    csrf = payload.get("csrf_token")
    if not isinstance(csrf, str) or len(csrf) < 32:
        raise ValidationFailure("login did not return a valid CSRF token")
    return csrf


def audit_events(client: httpx.Client, origin: str) -> list[dict[str, Any]]:
    response = client.get(
        "/api/operator/v1/audit?per_page=100", headers={"Origin": origin})
    assert_status(response, 200, "audit read")
    events = response.json().get("events", [])
    return events if isinstance(events, list) else []


def command_auth(client: httpx.Client, origin: str, email: str) -> dict[str, Any]:
    wrong = client.post("/api/auth/login", headers={"Origin": origin}, json={
        "email": email, "password": "deliberately-wrong-password",
    })
    assert_status(wrong, 401, "incorrect login")
    csrf = login(client, origin, email)
    current = client.get("/api/auth/me", headers={"Origin": origin})
    assert_status(current, 200, "session read")
    bad_origin = client.get(
        "/api/operator/v1/status", headers={"Origin": "https://invalid.example"})
    assert_status(bad_origin, 403, "incorrect Origin")
    missing_csrf = client.post(
        "/api/operator/v1/orders", headers={"Origin": origin}, json={})
    assert_status(missing_csrf, 403, "missing CSRF")
    events = [event for event in audit_events(client, origin)
              if event.get("action") in {"auth.login", "auth.logout"}]
    logout = client.post("/api/auth/logout", headers={
        "Origin": origin, "X-CSRF-Token": csrf,
    })
    assert_status(logout, 200, "logout")
    revoked = client.get("/api/auth/me", headers={"Origin": origin})
    assert_status(revoked, 401, "revoked session")
    return {
        "incorrect_login": "PASS", "correct_login": "PASS", "session": "PASS",
        "origin": "PASS", "csrf": "PASS", "logout": "PASS",
        "auth_audit_events_found": len(events),
    }


def command_rate_limit(client: httpx.Client, origin: str, email: str) -> dict[str, Any]:
    statuses = []
    for _ in range(6):
        response = client.post("/api/auth/login", headers={"Origin": origin}, json={
            "email": email, "password": "deliberately-wrong-password",
        })
        statuses.append(response.status_code)
    if statuses[:5] != [401] * 5 or statuses[5] != 429:
        raise ValidationFailure(f"unexpected rate-limit statuses: {statuses}")
    return {"rate_limit": "PASS", "statuses": statuses,
            "note": "wait for the next minute window before another login"}


def command_expiry(
        client: httpx.Client, origin: str, email: str,
        ttl_seconds: int) -> dict[str, Any]:
    login(client, origin, email)
    time.sleep(ttl_seconds + 2)
    expired = client.get("/api/auth/me", headers={"Origin": origin})
    assert_status(expired, 401, "expired session")
    return {"expiration": "PASS", "waited_seconds": ttl_seconds + 2}


def command_templates(client: httpx.Client, origin: str, email: str) -> dict[str, Any]:
    login(client, origin, email)
    response = client.get(
        "/api/operator/v1/email-templates", headers={"Origin": origin})
    assert_status(response, 200, "email templates")
    templates = response.json().get("templates", [])
    if not isinstance(templates, list) or len(templates) != 3:
        raise ValidationFailure("staging did not return exactly three installed allowlisted templates")
    return {"templates": templates}


def command_safe_state(client: httpx.Client, origin: str, email: str) -> dict[str, Any]:
    login(client, origin, email)
    response = client.get("/api/operator/v1/status", headers={"Origin": origin})
    assert_status(response, 200, "operator status")
    status = response.json()
    expected_false = (
        "writes_enabled", "order_create_enabled", "email_send_enabled",
        "aw26_product_writes_enabled", "aw26_publish_enabled",
    )
    unsafe = [name for name in expected_false if status.get(name) is not False]
    if unsafe:
        raise ValidationFailure(f"unsafe staging flags: {unsafe}")
    return {"safe_state": "PASS", **{name: False for name in expected_false}}


def load_json(path: str) -> dict[str, Any]:
    payload = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValidationFailure("request JSON must be an object")
    return payload


def reject_forbidden(value: Any, path: str = "request") -> None:
    if isinstance(value, dict):
        forbidden = FORBIDDEN_ORDER_FIELDS.intersection(value)
        if forbidden:
            raise ValidationFailure(f"forbidden fields at {path}: {sorted(forbidden)}")
        for key, item in value.items():
            reject_forbidden(item, f"{path}.{key}")
    elif isinstance(value, list):
        for index, item in enumerate(value):
            reject_forbidden(item, f"{path}[{index}]")


def command_order(
        client: httpx.Client, origin: str, email: str,
        request_path: str) -> dict[str, Any]:
    body = load_json(request_path)
    reject_forbidden(body)
    csrf = login(client, origin, email)
    headers = {"Origin": origin, "X-CSRF-Token": csrf}
    created = client.post("/api/operator/v1/orders", headers=headers, json=body)
    assert_status(created, 201, "order creation")
    result = created.json()
    operation_id, order_id = result.get("operation_id"), result.get("order_id")
    if not isinstance(operation_id, str) or not isinstance(order_id, int):
        raise ValidationFailure("order result omitted operation_id or order_id")
    replay = client.post("/api/operator/v1/orders", headers=headers, json=body)
    assert_status(replay, 201, "exact order replay")
    if replay.json().get("order_id") != order_id or replay.json().get("replayed") is not True:
        raise ValidationFailure("exact replay did not resolve to the original order")
    changed = copy.deepcopy(body)
    changed["status"] = "pending" if body.get("status") == "on-hold" else "on-hold"
    conflict = client.post("/api/operator/v1/orders", headers=headers, json=changed)
    assert_status(conflict, 409, "changed-payload replay")
    verified = client.get(
        f"/api/operator/v1/orders/{order_id}", headers={"Origin": origin})
    assert_status(verified, 200, "order read-after-write")
    order = verified.json()
    events = [event for event in audit_events(client, origin)
              if event.get("operation_id") == operation_id]
    if len(events) != 1 or events[0].get("state") != "verified":
        raise ValidationFailure("verified generalized audit event was not found")
    return {
        "operation_id": operation_id, "order_id": order_id,
        "status": order.get("status"), "currency": order.get("currency"),
        "total": order.get("total"), "shipping_total": order.get("shipping_total"),
        "line_items": order.get("line_items"), "payment_captured": order.get("payment_captured"),
        "read_after_write": "PASS", "exact_replay": "PASS",
        "changed_payload_409": "PASS", "audit_events": events,
    }


def command_email(
        client: httpx.Client, origin: str, email: str, order_id: int,
        request_path: str) -> dict[str, Any]:
    body = load_json(request_path)
    if set(body) != ALLOWED_EMAIL_FIELDS:
        raise ValidationFailure("email JSON must contain only template, reason, idempotency_key")
    csrf = login(client, origin, email)
    headers = {"Origin": origin, "X-CSRF-Token": csrf}
    templates = client.get(
        "/api/operator/v1/email-templates", headers={"Origin": origin})
    assert_status(templates, 200, "email templates")
    installed = {item.get("id") for item in templates.json().get("templates", [])
                 if item.get("enabled") is True}
    if body.get("template") not in installed:
        raise ValidationFailure("requested template is not enabled in the live staging allowlist")
    sent = client.post(
        f"/api/operator/v1/orders/{order_id}/email", headers=headers, json=body)
    assert_status(sent, 200, "email send")
    operation_id = sent.json().get("operation_id")
    replay = client.post(
        f"/api/operator/v1/orders/{order_id}/email", headers=headers, json=body)
    assert_status(replay, 200, "email replay")
    if replay.json().get("replayed") is not True:
        raise ValidationFailure("email replay was not idempotent")
    events = [event for event in audit_events(client, origin)
              if event.get("operation_id") == operation_id]
    if len(events) != 1 or events[0].get("state") != "verified":
        raise ValidationFailure("verified email audit event was not found")
    return {"operation_id": operation_id, "order_id": order_id,
            "template": body["template"], "sent": True,
            "exact_replay": "PASS", "audit_events": events}


def main() -> int:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("auth")
    subparsers.add_parser("rate-limit")
    expiry = subparsers.add_parser("expiry")
    expiry.add_argument("--ttl-seconds", type=int, required=True)
    subparsers.add_parser("templates")
    subparsers.add_parser("safe-state")
    order = subparsers.add_parser("order")
    order.add_argument("--request", required=True)
    email_command = subparsers.add_parser("email")
    email_command.add_argument("--order-id", type=int, required=True)
    email_command.add_argument("--request", required=True)
    args = parser.parse_args()
    try:
        base_url, origin, email = require_environment()
        with httpx.Client(base_url=base_url, timeout=45, follow_redirects=False) as client:
            if args.command == "auth":
                result = command_auth(client, origin, email)
            elif args.command == "rate-limit":
                result = command_rate_limit(client, origin, email)
            elif args.command == "expiry":
                result = command_expiry(client, origin, email, args.ttl_seconds)
            elif args.command == "templates":
                result = command_templates(client, origin, email)
            elif args.command == "safe-state":
                result = command_safe_state(client, origin, email)
            elif args.command == "order":
                result = command_order(client, origin, email, args.request)
            else:
                result = command_email(client, origin, email, args.order_id, args.request)
        print(json.dumps(result, indent=2, sort_keys=True))
        return 0
    except (ValidationFailure, httpx.HTTPError, json.JSONDecodeError, OSError) as error:
        print(json.dumps({"status": "FAIL", "error": str(error)}), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
