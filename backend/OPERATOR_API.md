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
psql $DATABASE_URL -f backend/supabase/migrations/003_operator_mockup_audit.sql
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
- `PRINTFUL_STORE_ID` — optional server-side Printful store identifier. It is only
  required when an account-level token can access more than one WooCommerce store;
  a single WooCommerce store is selected automatically through the read-only Stores API.
- `PRINTFUL_MOCKUP_GENERATION_ENABLED` — set to `true` only on the Operator API when
  generating review mockups. This permits only Printful mockup task creation;
  `OPERATOR_WRITES_ENABLED` stays `false` and WooCommerce writes remain blocked.
- `OPERATOR_API_TOKEN` — secret Bearer token, at least 32 characters.
- `OPERATOR_WRITES_ENABLED` — set to `false`; `start.py` also forces it to false.
- `AW26_PRODUCT_WRITE_ENABLED` — independent, default `false`; enables only the
  allowlisted AW26 product endpoint when an approved write is ready.
- `AW26_PUBLISH_ENABLED` — forced to `false` by `start.py`; the AW26 endpoint never
  accepts a status field and refuses to run under an unsafe publish configuration.
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
- `GET /api/operator/v1/aw26/products/{id}`
- `PATCH /api/operator/v1/aw26/products/{id}`
- `GET /api/operator/v1/audit?page=1&per_page=20`
- `GET /api/operator/v1/printful/status`
- `GET /api/operator/v1/printful/templates?limit=20&offset=0`
- `GET /api/operator/v1/printful/templates/{id}`
- `GET /api/operator/v1/printful/templates/{id}/mockup-styles`
- `POST /api/operator/v1/printful/templates/{id}/mockup-tasks/dry-run`
- `POST /api/operator/v1/printful/templates/{id}/mockup-tasks`
- `GET /api/operator/v1/printful/mockup-tasks/{id}`
- `GET /api/operator/v1/printful/sync-products?limit=20&offset=0`
- `GET /api/operator/v1/printful/sync-products/{id}`

The Printful integration uses GET for product and task data. Only the dedicated
mockup task route sends a POST upstream, generating temporary review images
without creating or publishing a product. Generation is restricted to the 17
IDs in `AW26_TEMPLATE_IDS` and requires an independently enabled flag. The
dry-run endpoint works while generation is disabled. It reads the template,
catalog variants and supported styles; selects one representative variant per
color (M, then S, then the first available size); uses the Product Template's
placements as the source of truth; and records a single-use plan. Its response
groups every supported style by placement, orders compatible editorial
candidates without hiding the complete style list, and reports planned tasks
separately from estimated generated files. Styles with different compatible
variant sets are grouped into separate tasks; multiple placements/styles can
share one task when their variant set matches.
It never sends a POST to Printful. Generation accepts only the `planId` returned
by that dry run: `{"planId":"<uuid>"}`. There is no generate-all endpoint.
For a controlled pilot, the dry-run may receive an exact selection body such as
`{"variantIds":[23054],"styleIds":[27318,27316]}`. Both unique, non-empty lists
are checked against the template and its live capabilities before the plan is saved.
Poll each returned `taskKeys` value explicitly via GET. Do not poll rapidly.
The generated URLs are temporary editorial-review files and are never uploaded
to WooCommerce or stored as permanent product assets by this API.
Completed task results require every requested style to be present. Printful may
return additional compatible files; they are accepted only when their style is
supported by the same catalog product and their variant matches the stored plan.
Such results use `PASS_WITH_EXTRA_OUTPUT`, list the IDs in `extraStyleIds`, and
mark each extra file with `extraUpstreamOutput: true`. `designPlacement` remains
separate from the photographed `mockupStyleName` and `mockupViewName`. Editorial
recommendations contain style IDs only; temporary output URLs are not persisted.
Do not put bearer tokens in browser URLs. The API does not persist tasks, so
record returned IDs before moving to the next template. Printful rate limits
task generation; allow at least 30 seconds between requests if the store is new.
Mockup plans and status checks are audited in server-only Postgres tables with
template ID, action, task key, status and timestamp. Failures are sanitized; no
raw Printful messages, credentials or request headers are stored or returned.
Template detail responses include a deduplicated `mockups` array. Printful's
documented `mockup_file_url` is preserved as `mockupUrl` and also becomes a
gallery entry when no richer per-image metadata is supplied upstream.

PATCH accepts exactly `name`, `reason`, `expected_version`, and `idempotency_key`.
It reads before writing, checks the complete product version, reserves a hashed
idempotency key, locks the product, writes only `name`, reads again, and records
before/after plus `operation_id` and `verified`. A stale version returns
`409 VERSION_CONFLICT`. Write outcomes that cannot be verified remain locked for
manual reconciliation and are never automatically replayed.

The AW26 product route is independently allowlisted for 19 verified candidates.
The active merchandising set contains 18 products. WooCommerce product `4102`
remains readable and hard-hideable but is excluded from AW26 by Lock City and does
not permit merchandising writes through this route.
Its GET response audits the draft/hidden parent,
all paginated variations, parent and variation prices, stock status, SKU, attributes, images,
categories and non-sensitive Printful metadata. PATCH accepts only `name`,
`description`, `short_description`, category IDs, `menu_order`, `retail_price`,
`reason`, `expected_version`, and `idempotency_key`. Retail price is applied only
to the existing variation IDs read immediately before the write for variable
products, or to the parent regular price for a simple product. Status, SKU,
stock and variation creation/deletion are not accepted. The product must be
`draft` and `hidden` before the write and remain so after read-after-write.
The endpoint uses the existing server-side lock and before/after audit records.
Its `expected_version` hashes a canonical commercial state: parent content,
category IDs, attribute names/options, ordered image IDs, visibility and menu
order, plus each variation's prices, status, SKU, stock state and attributes.
WooCommerce timestamps, permalinks, generated URLs, links, runtime metadata and
other transient response fields are excluded so repeated unchanged reads produce
the same version.

The authenticated AW26 category bootstrap is independently gated by the AW26
write flag and can only ensure the root categories `Accessories` and `AW26`.
It resolves existing categories by slug, name and hierarchy before creating and
rejects ambiguous matches. The 17-template root-category policy is centralized;
future WooCommerce products remain untouched until their AW26 mapping is verified.

The authenticated AW26 hard-hide endpoint accepts only concurrency, idempotency
and audit fields. It hardcodes `status=draft` and `catalog_visibility=hidden`,
then compares every other normalized parent and variation field after the write.
The candidate allowlist contains only the 19 verified AW26 WooCommerce IDs.
Ordinary AW26 merchandising updates are restricted to the 18-product active set.

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
