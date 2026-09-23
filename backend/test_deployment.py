import asyncio
import os
from pathlib import Path

import httpx

from operator_server import app  # noqa: E402
from start import production_settings  # noqa: E402


def test_operator_runtime_requirements_exclude_legacy_and_dev_packages():
    requirements = (Path(__file__).parent / "requirements-operator.txt").read_text(
        encoding="utf-8").lower()
    required = {"asyncpg", "fastapi", "httpx", "pydantic", "starlette", "uvicorn"}
    names = {line.split("=", 1)[0] for line in requirements.splitlines() if line.strip()}
    assert names == required
    assert not {"emergentintegrations", "motor", "pymongo", "pytest", "black",
                "mypy", "flake8", "pandas", "numpy"} & names


def test_public_liveness_has_no_configuration_details():
    async def run():
        async with httpx.AsyncClient(
                transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            return await client.get("/api/health")

    response = asyncio.run(run())
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_operator_app_imports_without_mongodb_environment(monkeypatch):
    monkeypatch.delenv("MONGO_URL", raising=False)
    monkeypatch.delenv("DB_NAME", raising=False)
    assert app.title == "LOCK CITY Operator API"


def test_independent_app_exposes_only_requested_routes():
    routes = {(route.path, method) for route in app.routes
              for method in (route.methods or set())}
    assert routes == {
        ("/api/health", "GET"),
        ("/api/operator/v1/status", "GET"),
        ("/api/operator/v1/products", "GET"),
        ("/api/operator/v1/products/{product_id}", "GET"),
        ("/api/operator/v1/products/{product_id}", "PATCH"),
        ("/api/operator/v1/audit", "GET"),
        ("/api/operator/v1/printful/status", "GET"),
        ("/api/operator/v1/printful/templates", "GET"),
        ("/api/operator/v1/printful/templates/{template_id}", "GET"),
        ("/api/operator/v1/printful/sync-products", "GET"),
        ("/api/operator/v1/printful/sync-products/{sync_product_id}", "GET"),
    }


def test_production_launcher_binds_provider_port_and_forces_read_only(monkeypatch):
    monkeypatch.setenv("PORT", "9123")
    monkeypatch.setenv("OPERATOR_WRITES_ENABLED", "true")
    settings = production_settings()
    assert settings == {"app": "operator_server:app", "host": "0.0.0.0", "port": 9123}
    assert os.environ["OPERATOR_WRITES_ENABLED"] == "false"


def test_production_launcher_rejects_invalid_port(monkeypatch):
    monkeypatch.setenv("PORT", "invalid")
    try:
        production_settings()
        assert False, "invalid PORT was accepted"
    except RuntimeError as exc:
        assert str(exc) == "PORT must be an integer"
