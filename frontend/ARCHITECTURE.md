# LOCK CITY V2 — Architecture

## Two coordinated layers

**DOM interface** (semantic HTML, SEO, a11y, commerce): navigation, headings,
product cards, filters, forms, cart drawer. All critical information lives in DOM.

**WebGL experience** (Three.js via R3F): hero environment, districts spatial
selector, featured-object artifact. The site is fully understandable without WebGL —
every canvas has `role="img"` with a label and a static fallback.

## Project structure

```
app/                    routes (App Router)
  layout.tsx            fonts, providers, nav, footer, cart drawer, cursor, toaster
  template.tsx          fast page transition (fade/rise)
  page.tsx              homepage scene composition
  shop|archive|city|journal/page.tsx
  collections/[slug]/page.tsx
  product/[slug]/page.tsx
components/
  Navigation.tsx        fixed header, scroll-aware backdrop
  MobileMenu.tsx        fullscreen editorial menu
  SearchOverlay.tsx     mock live search over the object index
  CartDrawer.tsx        slide-over bag + DEMO CHECKOUT modal
  Cursor.tsx            desktop-only custom cursor (data-cursor="explore|view|drag")
  Media.tsx             procedural SVG placeholder media (seeded, deterministic)
  ProductCard.tsx       editorial card + quick-add
  ProductDetail.tsx     gallery, size selector, accordions, related objects
  Reveal.tsx            Reveal + MaskText (masked line-by-line kinetic type)
  Marquee.tsx           slow editorial marquee (CSS, reduced-motion aware)
  StatusBadge.tsx       AVAILABLE / PRE-ORDER / COMING SOON / SOLD OUT
  Newsletter.tsx        Scene 10 — demo-only submit
  Footer.tsx            brand footer, "THE CITY NEVER SLEEPS" placeholder copy
  home/                 Scenes 00–10 (Loader, Hero, LatestDrop, ShopTheDrop,
                        Districts, FeaturedObject, TheCity, People,
                        ArchiveTeaser, Transmissions)
  three/
    SceneCanvas.tsx     shared wrapper: adaptive DPR, IntersectionObserver
                        render-pause, WebGL support detection, static fallback
    HeroScene.tsx       brutalist city grid (instanced), monoliths, fog, dust,
                        pointer + scroll camera rig
    DistrictScene.tsx   4 architectural district blocks, raycast hover,
                        emissive highlight, camera shift
    ObjectScene.tsx     scroll-driven rotating wireframe artifact
lib/
  types.ts              Product, ProductVariant, Collection, Drop,
                        ProductStatus, Cart, CartItem, Transmission
  mock-data.ts          MOCK DATA only
  commerce.ts           CommerceAdapter interface + MockCommerceAdapter
  cart.tsx              cart context (localStorage)
  utils.ts              cn, formatPrice, seededRandom
```

## Commerce mock layer

UI consumes `CommerceAdapter` (`lib/commerce.ts`) only:

```ts
export const commerce: CommerceAdapter = new MockCommerceAdapter();
```

Production swap: implement `LockCityApiAdapter implements CommerceAdapter`
against the future LOCK CITY ADMIN API (WooCommerce / Printful / Stripe / PayPal /
Email / Affiliates). No provider is ever called from the frontend. Product
components never touch raw JSON — they receive typed `Product` models.

## Motion system

- lenis lerp smooth scroll (skipped under `prefers-reduced-motion`), instance
  exposed as `window.__lenis` for programmatic scrolls
- framer-motion: `Reveal` (fade/rise on inView), `MaskText` (masked line reveal),
  route transitions via `template.tsx`
- Scroll-linked WebGL: framer-motion `useScroll` MotionValues feed camera
  position (hero depth-travel) and artifact rotation (featured object)
- Featured Object uses a tall sticky section (6 steps × 80vh); steps highlight
  via scroll progress. Native scrolling is never hijacked.

## Three.js performance strategy

- `useQuality()` → HIGH / MEDIUM / LOW / STATIC from cores, deviceMemory, viewport
- DPR capped: [1,2] high, [1,1.5] otherwise; antialias only on HIGH
- Render loop paused when canvas offscreen (IntersectionObserver → frameloop)
- Instanced meshes for the building grid; low-poly boxes; no post-processing
- Particle count: 900 high / 500 medium / 220 low
- STATIC (weak devices, `prefers-reduced-motion`, no WebGL): CSS radial-gradient
  fallback, zero WebGL
- Mobile: LOW profile — reduced density, particles, DPR; custom cursor disabled

## Accessibility

Semantic landmarks, labeled buttons/links, form labels, visible `:focus-visible`,
skip link, keyboard-focusable district controls, aria-live on shop result count,
`aria-current` on featured-object steps, reduced-motion removes camera travel,
parallax and marquee.

## Asset replacement process

Every placeholder visual is `<Media seed={n} code="…" label="…" />` — a seeded
procedural SVG clearly tagged `[PRODUCT MEDIA PENDING]` / `[LOCK CITY IMAGE
PENDING]`. To go live: replace Media usages with real campaign photography
components (keep the frame treatments: clipped corners, spotlight, mono grade).
Copy marked `[CONTENT PENDING]` / `[INFORMATION PENDING]` awaits real brand input.

## Future LOCK CITY ADMIN API

Planned data areas: products, orders, customers, coupons, affiliates, preorders,
analytics. The frontend will swap the adapter; UI stays untouched.

## Known prototype boundaries

- Account is a placeholder (no auth in scope)
- Checkout, newsletter and search run locally only (DEMO ONLY)
- Collection/product data is static mock content
