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

## Backlog
- P0: real brand assets + copy when provided ([INFORMATION PENDING] items)
- P1: LockCityApiAdapter against LOCK CITY ADMIN API when it exists
- P1: collection-page lightweight WebGL scene, footer ambient scene
- P2: account system, wishlist, drop countdown (needs real launch dates)
- P2: journal article detail pages, archive item detail modal
- P2: internationalization once country/language is defined

## Next tasks
1. Replace Media placeholders with real Lock City photography when delivered
2. Define brand accent color (currently pure monochrome by decision)
3. Wire newsletter to a provider via the future Admin API
