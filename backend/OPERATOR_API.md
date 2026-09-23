# LOCK CITY Operator API v1

The Operator API is an independent FastAPI deployment. Render starts
`operator_server:app`; this module does not import or initialize the MongoDB-backed
legacy `server.py`. WooCommerce stays behind the server and the frontend is not
part of this service.

## Supabase/Postgres setup

The project already used the server-side variable `DATABASE_URL` for its Supabase
schema. Operator API reuses that variable and connects directly with `asyncpg`.
Use the Supabase Transaction Pooler URI (port 6543) or another server-only Postgres
connection string. Do not use a browser anon/public key.

Apply migrations in order:

```text
psql $DATABASE_URL -f backend/supabase/migrations/001_initial_schema.sql
psql $DATABASE_URL -f backend/supabase/migrations/002_operator_api.sql
```

Migration 002 creates `operator_audit` and `operator_locks`. Both tables have RLS
enabled, no browser policy, and explicit revocation for `anon` and `authenticated`.
The database credential and all API credentials belong only in Render secrets.

## Render environment (names only)

- `DATABASE_URL` — secret server-side Supabase/Postgres connection string.
- `WC_REST_URL` — WooCommerce origin; configuration rather than a credential.
- `WC_REST_CONSUMER_KEY` — secret.
- `WC_REST_CONSUMER_SECRET` — secret.
- `PRINTFUL_API_TOKEN` — secret server-side token with `product_templates/read` and
  `sync_products/read`; it is never returned, logged, or stored by Operator API.
- `OPERATOR_API_TOKEN` — secret Bearer token, at least 32 characters.
- `OPERATOR_WRITES_ENABLED` — set to `false`; `start.py` also forces it to false.
- `PORT` — provided by Render.

`MONGO_URL` and `DB_NAME` are not used by this service. They remain documented in
`legacy.env.example` for the separate legacy backend.

## Routes

`GET /api/health` is an unauthenticated liveness probe and returns only
`{"status":"ok"}`. All routes under `/api/operator/v1` require
`Authorization: Bearer <operator token>` and return `Cache-Control: no-store`:

- `GET /api/operator/v1/status`
- `GET /api/operator/v1/products?page=1&per_page=20`
- `GET /api/operator/v1/products/{id}`
- `PATCH /api/operator/v1/products/{id}`
- `GET /api/operator/v1/audit?page=1&per_page=20`
- `GET /api/operator/v1/printful/status`
- `GET /api/operator/v1/printful/templates?limit=20&offset=0`
- `GET /api/operator/v1/printful/templates/{id}`
- `GET /api/operator/v1/printful/sync-products?limit=20&offset=0`
- `GET /api/operator/v1/printful/sync-products/{id}`

The Printful integration only implements upstream GET requests. It applies a
15-second timeout, does not retry mutations (none exist), normalizes returned
records, and converts upstream failures into error codes without returning raw
Printful messages or request headers.

PATCH accepts exactly `name`, `reason`, `expected_version`, and `idempotency_key`.
It reads before writing, checks the complete product version, reserves a hashed
idempotency key, locks the product, writes only `name`, reads again, and records
before/after plus `operation_id` and `verified`. A stale version returns
`409 VERSION_CONFLICT`. Write outcomes that cannot be verified remain locked for
manual reconciliation and are never automatically replayed.

## Run and verify

Render start command:

```text
python backend/start.py
```

Render build command:

```text
pip install -r backend/requirements-operator.txt
```

This production dependency set is isolated from the legacy backend and excludes
Emergent, MongoDB drivers, and development/test tooling.

The launcher listens on `0.0.0.0:$PORT` and forces writes off. Locally, run the
same command from the repository root after setting the required environment.
Use a trusted API client with the Bearer token to GET `/api/operator/v1/status`
and `/api/operator/v1/products/3704`. Keep the token in the client's secret store;
do not put it in a URL or shell history.

Validation commands from `backend/`:

```text
python -m pytest
python -m flake8 operator_api.py operator_server.py start.py test_operator_api.py test_operator_postgres.py test_deployment.py --max-line-length=120
python -m mypy operator_api.py operator_server.py start.py --ignore-missing-imports --follow-imports=silent
```

Tests use fake persistence and WooCommerce clients. They do not send a production
PATCH. Product deletion, refunds, payments, bulk updates, and unnecessary PII are
not implemented.
