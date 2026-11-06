"""Non-secret runtime identity and isolation rules for Operator deployments."""
import os
from urllib.parse import urlsplit


STAGING_WOO_HOST = "pruebasv2.lockcityclothes.com"
PRODUCTION_WOO_HOST = "commerce.lockcityclothes.com"


def _environment() -> str:
    return os.getenv("APP_ENV", "production").strip().lower()


def _woo_host() -> str:
    parsed = urlsplit(os.getenv("WC_REST_URL", "").strip())
    return (parsed.hostname or "").lower()


def validate_runtime_isolation() -> None:
    """Reject unsafe staging wiring before the application can serve traffic."""
    environment = _environment()
    if environment not in {"production", "staging"}:
        raise RuntimeError("APP_ENV must be production or staging")
    if environment != "staging":
        return
    if _woo_host() != STAGING_WOO_HOST:
        raise RuntimeError(
            "staging Operator must target pruebasv2.lockcityclothes.com")
    if os.getenv("PAYPAL_MODE", "").strip().lower() != "sandbox":
        raise RuntimeError("staging Operator requires PAYPAL_MODE=sandbox")


def runtime_status() -> dict:
    """Return deployment identity without credentials or store identifiers."""
    environment = _environment()
    woo_host = _woo_host() or None
    mockup_writes = os.getenv("PRINTFUL_MOCKUP_GENERATION_ENABLED") == "true"
    return {
        "environment": environment,
        "woo_target": woo_host,
        "wordpress_target": woo_host,
        "paypal_environment": os.getenv("PAYPAL_MODE", "unconfigured").strip().lower(),
        "printful_context": {
            "store_configured": bool(os.getenv("PRINTFUL_STORE_ID", "").strip()),
            "access": "mockup_generation" if mockup_writes else "read_only",
        },
    }
