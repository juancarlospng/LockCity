# LOCK CITY® — Technological Commerce System

**THE CITY IS ALIVE.** A cultural, cinematic storefront where collections are
DISTRICTS, products carry internal OBJECT identities, and releases are DROPS.
The front-end builds culture and desire; the system underneath is built to
function like software.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Three.js + React Three Fiber (progressive enhancement — never required to buy)
- framer-motion + lenis (motion), Tailwind CSS, sonner
- WooCommerce (catalog/orders/revenue — source of truth) via Store API
- Printful behind WooCommerce (production/fulfillment/cost)
- Supabase/Postgres (operational intelligence — schema in `backend/supabase/`)
- GA4 via GTM (behavioral analytics, gated behind `NEXT_PUBLIC_GTM_ID`)

## Run

```bash
yarn install
yarn start        # dev, 0.0.0.0:3000
yarn build        # production build (type-checked)
```

## Environment

See `.env.example`. Nothing loads or calls out until configured:

| Variable | Purpose | Scope |
| --- | --- | --- |
| `WC_STORE_URL` | WooCommerce Store API origin; configured in `.env.local` | server only |
| `NEXT_PUBLIC_GTM_ID` | GTM container (GA4 inside GTM) | public |
| `KLAVIYO_API_KEY` / `KLAVIYO_LIST_ID` | JOIN THE CITY provider (later) | server |
| `WC_URL` / `WC_CONSUMER_KEY` / `WC_CONSUMER_SECRET` | Admin REST API — backend only | server |
| `WC_WEBHOOK_SECRET` | Webhook HMAC validation | server |
| `DATABASE_URL` | Supabase Transaction Pooler URI (port 6543) | server |

## Architecture map

- Commerce adapter: `lib/commerce.ts` is server-only. `commerce-core.ts` reads all
  published products, following pagination and validating totals. Network,
  WooCommerce and configuration errors stay distinct from a valid empty result.
- Product images render via the existing `/store/media` proxy, restricted to
  uploads on the configured WooCommerce origin. Original image metadata is retained.
- Variations retain their IDs and attributes with `UNKNOWN` availability and no
  invented price. `getVariationById` prepares public Store API resolution and checks
  the returned parent; it is not connected to checkout or the cart in step 1B.
- Run `npm run test:catalog`, `npm run typecheck`, and `npm run build` to verify.
  `TEST_LIVE_STORE=1` adds read-only live catalog checks to the catalog tests.
- Edge routes: `/store/*` (same-origin WooCommerce Store API proxy) and
  `/join` (newsletter subscription abstraction). Note: `/api/*` is reserved
  for the platform backend — do not create Next route handlers under `/api`.
- Webhooks: `POST /api/webhooks/woocommerce` on the FastAPI backend —
  HMAC-SHA256 signature validation, idempotent via `X-WC-Delivery-ID`,
  503 fail-closed until configured.
- Analytics: `lib/analytics.ts` typed dataLayer events with automatic
  first-touch attribution (`lib/attribution.ts`).
- Data model: `backend/supabase/migrations/001_initial_schema.sql`
  (RLS enabled, service-role only).

## Rules

- No fabricated products, prices, people, drops or content — ever.
- Brand language (Districts, Objects, Drops) never replaces shopping language
  (Shop, Size, Add to Bag, Checkout).
- Three.js for experience; standard UI for commerce.
- Secrets live in env vars, server-side, never in the browser bundle.
