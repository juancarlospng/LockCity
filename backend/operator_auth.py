"""Cookie session authentication for the human Operator UI.

Secrets and raw session tokens never enter Postgres or application logs.
"""
from __future__ import annotations

import asyncio
import hashlib
import hmac
import os
import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlsplit

import asyncpg
from fastapi import APIRouter, Request
from pydantic import BaseModel, ConfigDict, Field, StrictStr, ValidationError
from starlette.responses import JSONResponse


COOKIE_NAME = "__Host-lc_operator_session"


class AuthError(Exception):
    def __init__(self, status: int, code: str):
        self.status = status
        self.code = code
        super().__init__(code)


class LoginBody(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    email: StrictStr = Field(min_length=3, max_length=254)
    password: StrictStr = Field(min_length=1, max_length=1024)


@dataclass(frozen=True)
class OperatorSession:
    actor_id: str
    email: str
    expires_at: datetime


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class PostgresAuthStore:
    def __init__(self, database_url: str | None):
        self.database_url = database_url or ""
        self._pool = None
        self._pool_lock = asyncio.Lock()

    async def _get_pool(self):
        if not self.database_url:
            raise AuthError(503, "AUTH_NOT_CONFIGURED")
        if self._pool is None:
            async with self._pool_lock:
                if self._pool is None:
                    try:
                        self._pool = await asyncpg.create_pool(
                            dsn=self.database_url, min_size=1, max_size=5,
                            command_timeout=20, statement_cache_size=0)
                    except Exception:
                        raise AuthError(503, "AUTH_UNAVAILABLE") from None
        return self._pool

    async def login_attempt(self, bucket_hash: str, allowed: bool) -> int:
        """Persist a fixed-window attempt without storing an email or IP."""
        pool = await self._get_pool()
        now = _utcnow()
        window = now.replace(second=0, microsecond=0)
        async with pool.acquire() as connection:
            async with connection.transaction():
                row = await connection.fetchrow(
                    """INSERT INTO public.operator_login_attempts
                           (bucket_hash, window_started_at, attempts, last_attempt_at)
                       VALUES ($1, $2, 1, $3)
                       ON CONFLICT (bucket_hash, window_started_at)
                       DO UPDATE SET attempts = operator_login_attempts.attempts + 1,
                                     last_attempt_at = EXCLUDED.last_attempt_at
                       RETURNING attempts""",
                    bucket_hash, window, now)
                if allowed:
                    await connection.execute(
                        "DELETE FROM public.operator_login_attempts WHERE bucket_hash = $1",
                        bucket_hash)
        return int(row["attempts"])

    async def create_session(
            self, token_hash: str, actor_id: str, expires_at: datetime) -> None:
        pool = await self._get_pool()
        await pool.execute(
            """INSERT INTO public.operator_sessions
                   (session_hash, actor_id, created_at, expires_at, revoked_at, last_seen_at)
               VALUES ($1, $2, $3, $4, NULL, $3)""",
            token_hash, actor_id, _utcnow(), expires_at)

    async def session(self, token_hash: str):
        pool = await self._get_pool()
        row = await pool.fetchrow(
            """SELECT actor_id, expires_at
               FROM public.operator_sessions
               WHERE session_hash = $1 AND revoked_at IS NULL AND expires_at > $2""",
            token_hash, _utcnow())
        if row is not None:
            await pool.execute(
                "UPDATE public.operator_sessions SET last_seen_at = $2 WHERE session_hash = $1",
                token_hash, _utcnow())
        return dict(row) if row is not None else None

    async def revoke(self, token_hash: str) -> None:
        pool = await self._get_pool()
        await pool.execute(
            """UPDATE public.operator_sessions SET revoked_at = $2
               WHERE session_hash = $1 AND revoked_at IS NULL""",
            token_hash, _utcnow())

    async def record_auth_event(
            self, *, action: str, state: str, http_status: int,
            error_code: str | None = None) -> None:
        """Write a PII-free security event to the generalized audit ledger."""
        pool = await self._get_pool()
        operation_id = uuid.uuid4()
        entropy = secrets.token_bytes(32)
        key_hash = hashlib.sha256(entropy).hexdigest()
        if action not in {"auth.login", "auth.logout"}:
            raise AuthError(500, "INVALID_AUTH_AUDIT")
        fingerprint = hashlib.sha256((action + ":v1").encode()).hexdigest()
        now = _utcnow()
        await pool.execute(
            """INSERT INTO public.operator_audit_events
                   (idempotency_key_hash, operation_id, request_fingerprint,
                    actor_id, action, entity_type, entity_id, state, reason,
                    before_payload, after_payload, result_payload, http_status,
                    error_code, created_at, updated_at)
               VALUES ($1, $2, $3, 'primary_operator', $4, 'session', NULL, $5,
                       'operator authentication', NULL, NULL, $6::jsonb,
                       $7, $8, $9, $9)""",
            key_hash, operation_id, fingerprint, action,
            state, '{"authenticated":' + ("true" if state == "verified" else "false") + '}',
            http_status, error_code, now)

    async def close(self):
        if self._pool is not None:
            await self._pool.close()
            self._pool = None


class OperatorAuthService:
    ACTOR_ID = "primary_operator"

    def __init__(self, store: Any):
        self.store = store

    @staticmethod
    def _configuration() -> tuple[str, bytes, bytes, int, str]:
        email = os.getenv("OPERATOR_ADMIN_EMAIL", "").strip().casefold()
        password_hash = os.getenv("OPERATOR_ADMIN_PASSWORD_HASH", "").encode()
        session_secret = os.getenv("OPERATOR_SESSION_SECRET", "").encode()
        allowed_origin = os.getenv("OPERATOR_ALLOWED_ORIGIN", "").rstrip("/")
        parsed_origin = urlsplit(allowed_origin)
        try:
            ttl = int(os.getenv("OPERATOR_SESSION_TTL_SECONDS", "28800"))
        except ValueError:
            ttl = 0
        if (not email or not password_hash.startswith((b"$2a$", b"$2b$", b"$2y$"))
                or len(session_secret) < 32 or not 300 <= ttl <= 86400
                or parsed_origin.scheme != "https" or not parsed_origin.hostname
                or parsed_origin.username or parsed_origin.password
                or parsed_origin.path not in ("", "/")
                or parsed_origin.query or parsed_origin.fragment):
            raise AuthError(503, "AUTH_NOT_CONFIGURED")
        return email, password_hash, session_secret, ttl, allowed_origin

    @classmethod
    def _mac(cls, secret: bytes, purpose: str, value: str) -> str:
        return hmac.new(secret, f"{purpose}:{value}".encode(), hashlib.sha256).hexdigest()

    @staticmethod
    def _verify_password(password: str, password_hash: bytes) -> bool:
        # Lazy import keeps read-only Operator routes independent from the
        # platform-specific bcrypt extension until a human login is attempted.
        import bcrypt
        return bcrypt.checkpw(password.encode(), password_hash)

    def require_origin(self, request: Request) -> None:
        *_, allowed_origin = self._configuration()
        origin = request.headers.get("origin", "").rstrip("/")
        if not origin or not hmac.compare_digest(origin, allowed_origin):
            raise AuthError(403, "ORIGIN_NOT_ALLOWED")

    async def login(self, request: Request, body: LoginBody):
        self.require_origin(request)
        email, password_hash, secret, ttl, _ = self._configuration()
        supplied_email = body.email.strip().casefold()
        client_ip = request.client.host if request.client is not None else "unknown"
        bucket = self._mac(secret, "login", f"{supplied_email}|{client_ip}")
        email_matches = hmac.compare_digest(supplied_email.encode(), email.encode())
        try:
            password_matches = self._verify_password(body.password, password_hash)
        except (ImportError, ValueError):
            raise AuthError(503, "AUTH_NOT_CONFIGURED") from None
        valid = email_matches and password_matches
        attempts = await self.store.login_attempt(bucket, valid)
        if attempts > 5:
            await self.store.record_auth_event(
                action="auth.login", state="failed", http_status=429,
                error_code="LOGIN_FAILED")
            raise AuthError(429, "LOGIN_FAILED")
        if not valid:
            await self.store.record_auth_event(
                action="auth.login", state="failed", http_status=401,
                error_code="LOGIN_FAILED")
            raise AuthError(401, "LOGIN_FAILED")
        token = secrets.token_urlsafe(48)
        expires = _utcnow() + timedelta(seconds=ttl)
        token_hash = self._mac(secret, "session", token)
        await self.store.create_session(token_hash, self.ACTOR_ID, expires)
        try:
            await self.store.record_auth_event(
                action="auth.login", state="verified", http_status=200,
                error_code=None)
        except Exception:
            await self.store.revoke(token_hash)
            raise
        csrf = self._mac(secret, "csrf", token)
        return token, csrf, expires, email

    async def authenticate(self, request: Request, *, csrf: bool = False) -> OperatorSession:
        email, _, secret, _, _ = self._configuration()
        token = request.cookies.get(COOKIE_NAME, "")
        if len(token) < 32:
            raise AuthError(401, "UNAUTHORIZED")
        row = await self.store.session(self._mac(secret, "session", token))
        if row is None:
            raise AuthError(401, "UNAUTHORIZED")
        if csrf:
            self.require_origin(request)
            supplied = request.headers.get("x-csrf-token", "")
            expected = self._mac(secret, "csrf", token)
            if not supplied or not hmac.compare_digest(supplied, expected):
                raise AuthError(403, "CSRF_FAILED")
        return OperatorSession(row["actor_id"], email, row["expires_at"])

    async def logout(self, request: Request) -> None:
        await self.authenticate(request, csrf=True)
        _, _, secret, _, _ = self._configuration()
        token = request.cookies.get(COOKIE_NAME, "")
        await self.store.revoke(self._mac(secret, "session", token))
        record = getattr(self.store, "record_auth_event", None)
        if record is not None:
            await record(action="auth.logout", state="verified", http_status=200,
                         error_code=None)


def create_auth_router(service: OperatorAuthService) -> APIRouter:
    router = APIRouter(prefix="/api/auth")

    def error(exc: AuthError):
        return JSONResponse({"error": exc.code}, status_code=exc.status,
                            headers={"Cache-Control": "no-store"})

    @router.post("/login")
    async def login(request: Request):
        try:
            raw = await request.body()
            if len(raw) > 4096:
                raise AuthError(413, "BODY_TOO_LARGE")
            try:
                body = LoginBody.model_validate_json(raw)
            except ValidationError:
                raise AuthError(401, "LOGIN_FAILED") from None
            token, csrf, expires, email = await service.login(request, body)
            response = JSONResponse({
                "authenticated": True, "email": email,
                "csrf_token": csrf, "expires_at": expires.isoformat(),
            }, headers={"Cache-Control": "no-store"})
            response.set_cookie(
                COOKIE_NAME, token, max_age=max(0, int((expires - _utcnow()).total_seconds())),
                secure=True, httponly=True, samesite="strict", path="/")
            return response
        except AuthError as exc:
            return error(exc)
        except Exception:
            return error(AuthError(503, "AUTH_UNAVAILABLE"))

    @router.post("/logout")
    async def logout(request: Request):
        try:
            await service.logout(request)
            response = JSONResponse({"authenticated": False},
                                    headers={"Cache-Control": "no-store"})
            response.delete_cookie(COOKIE_NAME, secure=True, httponly=True,
                                   samesite="strict", path="/")
            return response
        except AuthError as exc:
            return error(exc)
        except Exception:
            return error(AuthError(503, "AUTH_UNAVAILABLE"))

    @router.get("/me")
    async def me(request: Request):
        try:
            service.require_origin(request)
            session = await service.authenticate(request)
            _, _, secret, _, _ = service._configuration()
            token = request.cookies.get(COOKIE_NAME, "")
            return JSONResponse({
                "authenticated": True, "email": session.email,
                "csrf_token": service._mac(secret, "csrf", token),
                "expires_at": session.expires_at.isoformat(),
            }, headers={"Cache-Control": "no-store"})
        except AuthError as exc:
            return error(exc)
        except Exception:
            return error(AuthError(503, "AUTH_UNAVAILABLE"))

    return router
