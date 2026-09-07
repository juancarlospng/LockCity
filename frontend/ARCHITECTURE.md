# LOCK CITY — Architecture

## Two coordinated layers

**DOM interface** (semantic HTML, SEO, a11y, commerce): navigation, headings,
product UI, filters, forms, cart drawer. All critical information lives in DOM.

**WebGL experience** (Three.js via R3F, dynamically imported): hero city,
districts spatial selector. Progressive enhancement only — every canvas has
`role="img"`, an aria label, and a static fallback. Purchasing never depends
on WebGL.

## Project structure

```
app/
  layout.tsx            fonts, GTM (conditional), providers, nav, footer, cart, cursor
  template.tsx          fast route transition
  page.tsx              homepage scenes (Loader, Hero, LatestDrop, Districts,
                        TheCity=LOCKED IN, People, Archive, Transmissions, Join)
  shop|archive|city|journal/page.tsx
  collections/[slug]/page.tsx   district header + products via adapter
  product/[slug]/page.tsx       commercial product page (when catalog live)
  not-found.tsx         branded 404
  store/[...path]/route.ts      WooCommerce Store API same-origin proxy (503 if unset)
  join/route.ts                 newsletter subscription endpoint (503 until provider)
components/
  Navigation, MobileMenu, SearchOverlay (live store search), CartDrawer,
  Cursor, Media (procedural architectural graphic), ProductCard, ProductDetail,
  ShopGrid, EmptyState, Reveal/MaskText, Marquee, StatusBadge, Newsletter, Footer,
  AnalyticsRouteTracker
  home/  Loader, Hero, LatestDrop, Districts, TheCity, People, ArchiveTeaser,
         Transmissions
  three/ SceneCanvas (perf manager), HeroScene, DistrictScene
lib/
  types.ts        Product/ProductVariant with stable identifiers
                  (lock/woo/printful ids + SKU), Drop, Transmission, Person,
                  CartItem (display snapshot pattern)
  districts.ts    structural IA (CORE/DROP/COLLAB/ARCHIVE)
  commerce.ts     CommerceAdapter → WooCommerceAdapter | EmptyCommerceAdapter
  analytics.ts    typed GA4/GTM dataLayer events + purchaseOnce guard
  attribution.ts  first-touch UTM/promoter/coupon/referrer capture
  newsletter.ts   SubscriptionProvider abstraction (Null → Klaviyo later)
  cart.tsx        cart context (localStorage), analytics-instrumented
backend/ (FastAPI, platform service)
  server.py       POST /api/webhooks/woocommerce — HMAC-SHA256 signature
                  validation, topic allowlist, idempotent persistence via
                  unique delivery_id in MongoDB, 503 fail-closed
  supabase/migrations/001_initial_schema.sql — Lock City OS schema (12
                  entities, RLS enabled, service-role only)
```

## Source of truth rules

WooCommerce = catalog/orders/revenue · Printful = fulfillment/cost ·
GA4 = behavior · Supabase = operational intelligence · Lock City AI =
analysis only (later). The frontend never duplicates the catalog; it maps
WooCommerce data through the adapter with stable identifiers.

## Commerce flow (launch path)

1. Set `NEXT_PUBLIC_WC_STORE_URL` → catalog, collections and search go live
   automatically (adapter switches from Empty to WooCommerce).
2. Checkout button redirects to the WooCommerce native checkout; cart sync via
   Store API cart endpoints (nonce/cart-token preserved by `/store/*` proxy).
3. WooCommerce webhooks → backend `/api/webhooks/woocommerce` → MongoDB
   (now) → n8n/Supabase sync (P1).

## Three.js performance

- `next/dynamic` with `ssr:false` for every scene — Three.js is excluded from
  the initial bundle; a static gradient poster renders first
- `useQuality()` tiers HIGH/MEDIUM/LOW/STATIC (cores, memory, viewport)
- DPR caps, instanced building grid, no post-processing, particles 900/500/220
- Render loop pauses when canvas leaves viewport (IntersectionObserver) AND
  when the tab is hidden (`visibilitychange`)
- STATIC fallback for weak devices / reduced-motion / no WebGL

## Analytics

Events: page_view (SPA-aware), view_home, enter_city, view_collection,
view_item, select_size, add_to_cart, view_cart, remove_from_cart,
begin_checkout, purchase (deduplicated), email_signup, interact_3d.
All carry first-touch attribution metadata. Nothing loads until
`NEXT_PUBLIC_GTM_ID` is set; consent defaults are queued before GTM starts.

## Security

- Admin WooCommerce keys + webhook secret: server-only env vars
- Store API proxy: public surface by design, no credentials
- Webhooks: raw-body HMAC validation, constant-time compare, idempotency keys
- Supabase: RLS on all tables, no public policies, service-role only
- Financially sensitive actions (payouts, refunds, pricing) require the
  `approvals` table — never automatic

## Asset pipeline (future)

Real campaign/product photography replaces the procedural `Media` graphic.
Prefer optimized GLB/glTF for future hero-product VIEW IN 3D; mobile
performance outranks cinematic weight.
