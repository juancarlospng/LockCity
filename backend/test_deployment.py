import asyncio
import os

import httpx

os.environ.setdefault("MONGO_URL", "mongodb://127.0.0.1:27017")
os.environ.setdefault("DB_NAME", "lockcity_test")

from server import app  # noqa: E402
from start import production_settings  # noqa: E402


def test_public_liveness_has_no_configuration_details():
    async def run():
        async with httpx.AsyncClient(
                transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            return await client.get("/api/health")

    response = asyncio.run(run())
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_production_launcher_binds_provider_port_and_forces_read_only(monkeypatch):
    monkeypatch.setenv("PORT", "9123")
    monkeypatch.setenv("OPERATOR_WRITES_ENABLED", "true")
    settings = production_settings()
    assert settings == {"app": "server:app", "host": "0.0.0.0", "port": 9123}
    assert os.environ["OPERATOR_WRITES_ENABLED"] == "false"


def test_production_launcher_rejects_invalid_port(monkeypatch):
    monkeypatch.setenv("PORT", "invalid")
    try:
        production_settings()
        assert False, "invalid PORT was accepted"
    except RuntimeError as exc:
        assert str(exc) == "PORT must be an integer"
