# LOCK CITY V2 — Architecture

## Repository audit and scope
The entire repository at `fe9c9d6` contains only `LOCK_CITY_V2_MASTER_BRIEF.md` (read in full before edits). There is no existing application, package manager, routing, styling, commerce, asset library, deployment configuration or reusable implementation. The master is preserved. This implementation follows the user's narrower first-task scope over milestone 34: only the shell, hero, DOM Latest Drop placeholder and footer. No product grid, districts, commerce workflows or production connections.

## Application and route architecture
Next.js App Router, React 19, strict TypeScript, npm lockfile, CSS tokens and native CSS. Server components own document structure, metadata and content. Only navigation and the optional experience island use client components. Static export is sufficient for this prototype; the future API adapter will require revisiting server deployment.

Only `/` is implemented. Planned routes (not linked until implemented):

| Routes | Purpose / immersion |
| --- | --- |
| `/` | Editorial entry / high, optional WebGL |
| `/shop`, `/new`, `/collections/[slug]` | Discovery / medium |
| `/product/[slug]` | Story and commerce / controlled |
| `/drops`, `/drops/[slug]` | Drop index and story / medium |
| `/archive`, `/archive/[slug]` | Historical content / medium |
| `/city`, `/city/story`, `/city/people`, `/city/collaborations` | Culture / selective |
| `/journal`, `/journal/[slug]` | Editorial / primarily DOM |
| `/search` | Search / DOM |
| `/cart` | Conversion / DOM |
| `/account`, `/contact`, `/legal` | Utility / DOM |

Checkout route, identity model and deployment host: [INFORMATION PENDING]. These are design boundaries, not implemented services.

## Components and state
`app/layout.tsx` owns global landmarks and metadata; `app/page.tsx` composes `Hero` and `LatestDrop`. `components/shell` owns navigation/footer, `components/ui` reusable links/labels, and `components/experience` the optional WebGL lifecycle. `lib/commerce` owns a typed read-only adapter. Menu state stays in Navigation; capability and visibility state stay in Experience; camera targets remain mutable refs rather than React state. No global store is needed.

## Design system and responsive strategy
`app/tokens.css` centralizes bone, void, graphite and steel, space scale, display/utility roles, fluid type, content grid, layer order, borders, media ratios and motion. CSS uses a 48rem desktop enhancement breakpoint matching the WebGL media query. System fonts are deliberate development fallbacks; approved fonts and licensing: [INFORMATION PENDING]. Header uses inline desktop navigation and an accessible disclosure on small screens. Fluid headline, reserved media dimensions, 44px targets and a stacked mobile drop section avoid desktop scaling assumptions.

## WebGL architecture
The HTML hero is complete before JavaScript. `Experience` checks media queries, reduced motion, save-data, visibility and WebGL2 capability before dynamically importing `ExperienceCanvas`. A single transparent R3F canvas layers an architectural portal over the static concept image. `CityScene` holds reusable geometry, `CameraRig` handles bounded damped pointer motion, and Drei `PerformanceMonitor` degrades DPR across HIGH (1.5), MEDIUM (1.25), LOW (1) and STATIC. No downloaded models, HDRIs, textures or post-processing. On sustained instability, error or context loss, remove the canvas and retain the image. R3F owns/disposes declarative geometry and materials. Listeners, intersection observers and animation frames are cleaned up. No canvas exists outside the hero.

## Animation architecture
Native anchor scrolling provides the hero-to-drop transition without scroll hijacking. CSS reveals are progressive enhancements. Camera interaction is scoped to the visible hero, clamped and frame-rate independent. Hidden/offscreen rendering pauses. Reduced motion disables canvas and smooth/reveal movement; all information and CTAs remain. GSAP/ScrollTrigger are intentionally deferred: this slice does not justify their runtime or lifecycle complexity.

## Commerce adapter boundary
`CommerceAdapter.getLatestDrop()` returns a discriminated mock placeholder with an explicit `DEMO / MOCK DATA` label. The UI accepts this normalized model. Future `LockCityApiAdapter` will call only LOCK CITY ADMIN API on the server; WooCommerce, fulfillment and payments stay behind it. Product state union reserves AVAILABLE, PRE_ORDER, COMING_SOON, SOLD_OUT. No invented product records, prices, stock, SKU, launch date or sales promise. All actual taxonomy, content, availability, commercial rules, policies, API contract and URLs: [INFORMATION PENDING]. No environment variables or secrets are required for this slice.

## Accessibility and SEO
Semantic header/nav/main/section/footer, one HTML h1, skip link, visible focus, expanded-state menu button, Escape dismissal and focus return. Anchor targets have scroll margins. The decorative image/canvas are hidden from assistive technology. Content works without WebGL or JavaScript. Draft metadata uses noindex; canonical origin, real descriptions, Open Graph assets and sitemap origin remain [INFORMATION PENDING]. Add route metadata and real Product JSON-LD only when verified records exist. Never index mock commerce or fabricate structured data.

## Performance and assets
The critical path is HTML, CSS and a local responsive WebP concept image. Heavy Three/R3F/Drei chunks load only for eligible desktop fine-pointer devices. Static mobile is a product decision, with runtime performance measurements supplementing desktop eligibility. No particles, shadow maps, continuous scrolling library, remote fonts or third-party scripts. Concept imagery is clearly demo material, not a real location or product. Source/provenance is recorded in `public/assets/README.md`. Future pipeline: licensed originals -> responsive AVIF/WebP; GLB with Meshopt/Draco only when beneficial, KTX2 textures, per-scene budgets, lazy preload at scene boundary. Initial targets: no layout shift from media, <=350KB hero image, <=100 draw calls, DPR <=1.5. Validate actual load and frame behavior, not only hardware labels.

## Validation and follow-up
Run lint, strict typecheck, production build, then browser checks at desktop/mobile, menu keyboard flow, anchor navigation, reduced motion, WebGL failure, hidden/offscreen behavior and repeated mount/unmount. Record results and limitations in `PERFORMANCE.md`. No production integrations, authentication, checkout, analytics, publication or business-data mutation in this task.
