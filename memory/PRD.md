# LOCK CITY V2 — PRD

## Original problem statement
Build a visually exceptional, Awwwards-level interactive prototype for LOCK CITY V2 —
a streetwear/lifestyle ecommerce site treated as a digital place ("THE CITY IS ALIVE").
Collections = DISTRICTS, products = OBJECTS, releases = DROPS, history = ARCHIVE,
editorial = TRANSMISSIONS, community = PEOPLE OF THE CITY. Two coordinated layers:
DOM interface + WebGL experience. Mock data only, adapter-based commerce layer ready
for a future LOCK CITY ADMIN API. Pure monochrome palette (#050505 / #F1EFE9 /
#222222 / #747474). Highest creative effort: ENTER THE CITY, LATEST DROP,
DISTRICTS, FEATURED OBJECT.

## User decisions (locked)
- Stack: rebuilt as Next.js 15 + TypeScript (per user choice)
- Accent: none — pure monochrome
- Priority: homepage scenes 00–10 + WebGL; Shop/Product/Cart functional but simpler
- Media: abstract/generated placeholders only, no stock photography
- Motion: framer-motion + lenis; masked line-by-line hero reveal; slow editorial
  marquee; numbered manifesto chapters; subtle parallax/3D hero

## Architecture (done)
- Next.js App Router on port 3000 (supervisor `yarn start` → `next dev`)
- three/@react-three/fiber/drei WebGL layer with SceneCanvas performance manager
  (adaptive DPR, offscreen pause, quality tiers HIGH/MEDIUM/LOW/STATIC)
- CommerceAdapter + MockCommerceAdapter (lib/commerce.ts) — future LockCityApiAdapter
- Cart context + drawer, localStorage-persisted
- Procedural seeded SVG placeholder media system (components/Media.tsx)

## User personas
- Streetwear customer: wants to discover drops and buy quickly
- Culture visitor: explores brand world, editorial, community
- Creative director (stakeholder): evaluates the experience language

## Core requirements (static)
Homepage scenes 00–10; routes / /shop /collections/[slug] /product/[slug]
/archive /city /journal; mock cart drawer with demo checkout; custom cursor
(desktop); reduced-motion + accessibility support; mobile-specific simplification;
no production credentials; all fake content labeled MOCK DATA / [INFORMATION
PENDING].

## Implemented (2026-09-05)
- Scene 00 Initialization loader (once per session, skippable)
- Scene 01 Enter The City: WebGL brutalist city, masked kinetic LOCK CITY® reveal,
  pointer parallax, scroll depth-travel, STATUS: LIVE
- Scene 02 Latest Drop (DROP_006, parallax media, CTAs)
- Scene 03 Shop The Drop (6 mock product cards, quick-add)
- Scene 04 Districts: 3D spatial selector, raycast hover, camera shift, DOM controls
- Scene 05 Featured Object: 6-step pinned scroll sequence, rotating wireframe artifact
- Scene 06 The City (manifesto chapters), 07 People (drag scroller), 08 Archive
  teaser, 09 Transmissions, 10 Join The City (demo newsletter)
- Editorial marquee, footer with giant placeholder sign-off
- /shop (filters + sort), /collections/[slug], /product/[slug] (gallery, sizes,
  accordions, related), /archive, /city, /journal
- Search overlay (mock index), mobile fullscreen menu, page transitions
- README.md + ARCHITECTURE.md
- 2026-09-05 fix: package-lock.json + .npmrc (legacy-peer-deps) committed so Vercel
  npm-based production build resolves @types/node / typescript devDependencies;
  `npm run build` verified green (exit 0, 8/8 routes)

## Verified
- All routes return 200; hero/drop/districts/object/newsletter/footer screenshotted
- Add to bag → drawer → qty +/- (subtotal €360 at 2×) → DEMO CHECKOUT modal → close
- Newsletter success state; mobile 390px hero/menu/shop verified

## Implemented (2026-09-07 — production foundation pass)
- PHASE 0 audit executed; all public prototype/mock language removed (verified by grep)
- Mock catalog deleted; honest empty/coming-soon states everywhere (shop, districts,
  product, people, archive, transmissions, search, cart checkout, newsletter)
- CommerceAdapter → WooCommerceAdapter (Store API) with EmptyCommerceAdapter fallback
- Same-origin Store API proxy at /store/* + /join newsletter endpoint (both fail-closed 503)
- WooCommerce webhook on FastAPI: HMAC-SHA256 validation, topic allowlist, Mongo idempotency
- GA4/GTM layer: conditional loader, consent defaults, typed events, SPA page_view,
  purchase dedup guard; first-touch attribution (UTM/promoter/coupon) on every event
- Supabase schema (12 entities, RLS, service-role only) as SQL migration
- Three.js: next/dynamic ssr:false (home First Load JS 414→156 kB), hidden-tab pause,
  offscreen pause, quality tiers, static fallbacks
- LOCKED IN official manifesto replaces invented copy; footer "LOCKED IN"
- Product identifiers (lock/woo/printful + SKU) in types; snapshot-based cart

## Backlog
- P0 blocked on credentials: WooCommerce keys (store URL + REST keys + webhook secret),
  GA4/GTM ID, Klaviyo, real product photography, legal pages content
- P1: Supabase connection (Transaction Pooler URI), n8n boundaries, promoter CRM UI,
  Printful cost sync, daily reporting
- P2: Lock City AI, ASK THE CITY concierge (tool-grounded), promoter intelligence
- P3: VIEW IN 3D hero products (GLB), AR, adaptive scene per drop

## Next tasks
1. User adds NEXT_PUBLIC_WC_STORE_URL + WC keys via Emergent secrets → catalog goes live
2. User adds NEXT_PUBLIC_GTM_ID → analytics live
3. Klaviyo keys → /join switches from Null provider to KlaviyoProvider
4. Supabase Transaction Pooler URI → run migration 001, wire webhook sync
