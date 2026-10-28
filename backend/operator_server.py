"""Independent deployment application for LOCK CITY Operator API."""
import asyncio
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI

from operator_api import PostgresStore, create_router
from operator_environment import validate_runtime_isolation
from render_network_diagnostic import run_network_diagnostic


def create_app(store=None, woo=None, printful=None):
    validate_runtime_isolation()
    operator_store = store or PostgresStore(os.getenv("DATABASE_URL"))

    @asynccontextmanager
    async def lifespan(_app):
        diagnostic_task = None
        if os.getenv("RENDER"):
            diagnostic_task = asyncio.create_task(run_network_diagnostic())
        try:
            yield
        finally:
            if diagnostic_task is not None and not diagnostic_task.done():
                diagnostic_task.cancel()
                await asyncio.gather(diagnostic_task, return_exceptions=True)
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

    application.include_router(create_router(operator_store, woo, printful))
    return application


app = create_app()
