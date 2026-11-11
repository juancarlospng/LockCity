"""Independent deployment application for LOCK CITY Operator API."""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI

from operator_audit import AuditEvents, PostgresAuditEventStore
from operator_api import PostgresStore, WooClient, create_router
from operator_auth import OperatorAuthService, PostgresAuthStore, create_auth_router
from operator_environment import validate_runtime_isolation
from operator_orders import AdminOrderService


def create_app(
        store=None, woo=None, printful=None, auth_store=None,
        audit_event_store=None, auth_service=None, order_service=None):
    validate_runtime_isolation()
    database_url = os.getenv("DATABASE_URL")
    operator_store = store or PostgresStore(database_url)
    session_store = auth_store or PostgresAuthStore(database_url)
    event_store = audit_event_store or PostgresAuditEventStore(database_url)
    operator_auth = auth_service or OperatorAuthService(session_store)
    audit_events = AuditEvents(event_store)
    operator_woo = woo or WooClient()
    operator_orders = order_service or AdminOrderService(operator_woo, audit_events)

    @asynccontextmanager
    async def lifespan(_app):
        yield
        for resource in (operator_store, session_store, event_store):
            close = getattr(resource, "close", None)
            if close is not None:
                await close()

    application = FastAPI(
        title="LOCK CITY Operator API",
        lifespan=lifespan,
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
    )

    @application.get("/api/health", include_in_schema=False)
    async def health():
        return {"status": "ok"}

    application.include_router(create_auth_router(operator_auth))
    application.include_router(create_router(
        operator_store, operator_woo, printful, operator_auth,
        audit_events, operator_orders))
    return application


app = create_app()
