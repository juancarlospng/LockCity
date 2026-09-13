"""Production launcher for the independent Operator API application."""
import os

import uvicorn


def production_settings():
    # This deployment phase is read-only regardless of a stale provider variable.
    os.environ["OPERATOR_WRITES_ENABLED"] = "false"
    try:
        port = int(os.environ.get("PORT", "8000"))
    except ValueError as exc:
        raise RuntimeError("PORT must be an integer") from exc
    if not 1 <= port <= 65535:
        raise RuntimeError("PORT must be between 1 and 65535")
    return {"app": "operator_server:app", "host": "0.0.0.0", "port": port}


def main():
    uvicorn.run(**production_settings())


if __name__ == "__main__":
    main()
