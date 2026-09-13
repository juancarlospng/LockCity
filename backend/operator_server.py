"""Independent deployment application for LOCK CITY Operator API."""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI

from operator_api import PostgresStore, create_router


def create_app(store=None, woo=None):
    operator_store = store or PostgresStore(os.getenv("DATABASE_URL"))

    @asynccontextmanager
    async def lifespan(_app):
        yield
        close = getattr(operator_store, "close", None)
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

    application.include_router(create_router(operator_store, woo))
    return application


app = create_app()
