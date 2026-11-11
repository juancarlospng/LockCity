import asyncio
from datetime import datetime, timezone

import httpx
import pytest
from fastapi import FastAPI

from operator_auth import COOKIE_NAME, OperatorAuthService, create_auth_router


class AuthStore:
    def __init__(self):
        self.sessions = {}
        self.revoked = set()
        self.attempts = {}
        self.audit_events = []

    async def login_attempt(self, bucket_hash, allowed):
        self.attempts[bucket_hash] = self.attempts.get(bucket_hash, 0) + 1
        count = self.attempts[bucket_hash]
        if allowed:
            self.attempts.pop(bucket_hash, None)
        return count

    async def create_session(self, token_hash, actor_id, expires_at):
        self.sessions[token_hash] = {"actor_id": actor_id, "expires_at": expires_at}

    async def session(self, token_hash):
        value = self.sessions.get(token_hash)
        if (value is None or token_hash in self.revoked
                or value["expires_at"] <= datetime.now(timezone.utc)):
            return None
        return value

    async def revoke(self, token_hash):
        self.revoked.add(token_hash)

    async def record_auth_event(self, **event):
        self.audit_events.append(event)


@pytest.fixture
def auth_app(monkeypatch):
    monkeypatch.setenv("OPERATOR_ADMIN_EMAIL", "operator@example.com")
    monkeypatch.setenv("OPERATOR_ADMIN_PASSWORD_HASH", "$2b$12$" + "x" * 53)
    monkeypatch.setenv("OPERATOR_SESSION_SECRET", "s" * 48)
    monkeypatch.setenv("OPERATOR_SESSION_TTL_SECONDS", "3600")
    monkeypatch.setenv("OPERATOR_ALLOWED_ORIGIN", "https://admin.example.com")
    monkeypatch.setattr(
        OperatorAuthService, "_verify_password",
        staticmethod(lambda password, _password_hash: password == "correct-password"))
    store = AuthStore()
    app = FastAPI()
    app.include_router(create_auth_router(OperatorAuthService(store)))
    return app, store


def call(auth_app, method, path, **kwargs):
    async def run():
        async with httpx.AsyncClient(
                transport=httpx.ASGITransport(app=auth_app[0]),
                base_url="https://operator.example.com") as client:
            return await client.request(method, path, **kwargs)
    return asyncio.run(run())


def login(auth_app, password="correct-password"):
    return call(auth_app, "POST", "/api/auth/login",
                headers={"Origin": "https://admin.example.com"},
                json={"email": "operator@example.com", "password": password})


def test_correct_and_incorrect_login(auth_app):
    good = login(auth_app)
    assert good.status_code == 200
    assert good.cookies.get(COOKIE_NAME)
    assert "HttpOnly" in good.headers["set-cookie"]
    assert "SameSite=strict" in good.headers["set-cookie"]
    assert "Secure" in good.headers["set-cookie"]
    assert auth_app[1].audit_events[-1]["action"] == "auth.login"
    assert auth_app[1].audit_events[-1]["state"] == "verified"
    bad = login(auth_app, "wrong-password")
    assert bad.status_code == 401
    assert bad.json() == {"error": "LOGIN_FAILED"}
    assert auth_app[1].audit_events[-1]["state"] == "failed"


def test_invalid_origin_and_session(auth_app):
    assert call(auth_app, "POST", "/api/auth/login",
                headers={"Origin": "https://evil.example"},
                json={"email": "operator@example.com", "password": "correct-password"}
                ).status_code == 403
    assert call(auth_app, "GET", "/api/auth/me",
                headers={"Origin": "https://admin.example.com"}).status_code == 401


def test_login_rate_limit_is_generic(auth_app):
    responses = [login(auth_app, "wrong-password") for _ in range(6)]
    assert [response.status_code for response in responses[:5]] == [401] * 5
    assert responses[5].status_code == 429
    assert responses[5].json() == {"error": "LOGIN_FAILED"}


def test_expired_session(auth_app):
    response = login(auth_app)
    token = response.cookies.get(COOKIE_NAME)
    _, _, secret, _, _ = OperatorAuthService._configuration()
    token_hash = OperatorAuthService._mac(secret, "session", token)
    auth_app[1].sessions[token_hash]["expires_at"] = datetime(2000, 1, 1, tzinfo=timezone.utc)
    assert call(auth_app, "GET", "/api/auth/me",
                headers={"Origin": "https://admin.example.com"},
                cookies={COOKIE_NAME: token}).status_code == 401


def test_logout_requires_csrf_and_revokes(auth_app):
    response = login(auth_app)
    token = response.cookies.get(COOKIE_NAME)
    csrf = response.json()["csrf_token"]
    cookies = {COOKIE_NAME: token}
    headers = {"Origin": "https://admin.example.com"}
    assert call(auth_app, "POST", "/api/auth/logout",
                headers=headers, cookies=cookies).status_code == 403
    assert call(auth_app, "POST", "/api/auth/logout",
                headers={**headers, "X-CSRF-Token": csrf},
                cookies=cookies).status_code == 200
    assert auth_app[1].audit_events[-1]["action"] == "auth.logout"
    assert call(auth_app, "GET", "/api/auth/me",
                headers=headers, cookies=cookies).status_code == 401
