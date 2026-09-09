# LOCK CITY CLOTHES — Phase 1 architecture

## Scope and current stack

The existing Next.js 15.5.25 App Router application is retained, with React 19, TypeScript, Tailwind 3, Framer Motion and Three.js / React Three Fiber / Drei. Yarn 1.22.22 is the authoritative package manager. This phase is a storefront facade, with no external commerce, analytics, authentication, email or payment integrations. Existing backend files elsewhere in the repository are outside the active frontend and have not been connected or started.

## Routes and rendering

Server pages read the local interfaces in lib/commerce.ts and lib/content.ts. Critical headings, navigation, product information and empty states render in HTML. Routes: /, /shop, /shop/[slug], /product/[slug] (preserved canonical product route), /drops, /drops/[slug], /city, /people, /people/[slug], /archive, /transmissions, /transmissions/[slug], /journal (preserved), /cart and /collections/[slug]. Unknown records use Next notFound and a relevant detail template with 404 semantics. Unknown general routes use the branded global 404. There is no root loading boundary: this avoids streaming a 200 response before record lookup, and leaves critical HTML readable without JavaScript. ProductGrid provides an explicit skeleton loading state for future asynchronous feeds.

## Component boundaries

- Layout: fonts, local CartProvider, Navigation, semantic main, Footer and CartDrawer.
- Navigation: StoreLink, MobileMenu, SearchOverlay and native Modal dialogs. Dialogs handle focus trapping, Escape, body scroll locking and focus restoration.
- Home: Hero, NextDrop, SelectedObjects, Districts, TheCity (LOCKED IN), People, ArchiveTeaser, Transmissions and Newsletter.
- Commerce: ProductCard, ProductImage, ProductGallery, ProductDetail, SizeSelector, ProductGrid/ShopGrid, CartContents.
- Editorial: PersonCard, DropCard, ArchiveCard, TransmissionCard, ContentIndex and detail components. PersonDetail accepts products for SHOP WHAT THEY WEAR.
- States: EmptyState, image fallback, route error/not-found, grid skeletons and a persistent city poster.

## Design system and responsive strategy

Global tokens define background, bone foreground, steel text, graphite borders and onyx surfaces. Tailwind extends the same palette. Anton provides display headings; Space Mono handles text and metadata. Shared page/section spacing, title scales, button, input, choice and grid classes prevent route-specific drift. Controls have 44px touch targets, visible focus and deliberate hover transitions. Mobile navigation replaces the full navigation below 1280px. Grid columns and typography respond to available width. Media containers constrain their width even when a minimum height is specified.

## Three.js and motion

SceneGate imports no Three code. It renders a local poster in server HTML and mounts a dynamically imported scene only near the viewport, at >=1024px with a fine pointer, without reduced motion or Save-Data. Small/touch devices keep the poster. Hero and district scenes are confined to the city experience; shop, product and cart routes do not require them. SceneCanvas probes WebGL2, caps DPR at 1/1.25/1.5, adapts density and degrades after repeated low frame rate samples. Context loss or initialization failure retains the poster. Instanced geometry, simple lighting and no shadow/postprocessing passes keep cost bounded. R3F owns declarative resource disposal; observers, listeners and idle timers clean up on unmount. Offscreen/hidden/idle rendering pauses. Camera damping uses frame delta. Critical DOM content is never hidden waiting for motion. CSS progressive reveal and native scrolling are preferred; Framer Motion supplies the hero scroll value. No GSAP or Lenis runtime is needed.

## Data contracts and future integration

CommerceAdapter is always EmptyCommerceAdapter in Phase 1, independent of environment variables. ContentSource returns empty typed records. Product, ProductVariant, ProductMedia, Person, Drop, ArchiveEntry and Transmission describe future content without fabricating records. ProductCard prioritizes commercialName/name over objectCode/code. ProductDetail supports variants, care/fit/material/GSM/construction, size guide, story, shipping/returns, media, creator content, people, related products and bundles. Optional 3D is represented by a poster slot; interactive product model loading is deferred.

Replace the local service implementation in a separately approved integration phase, preserving these presentation props. No duplicate catalog is maintained. Cart is local and empty; purchase and checkout remain disabled. Join validates local input and explicitly says nothing was stored or sent. Legacy /store/\* and POST /join always return 503. No credentials can activate those routes. StoreLink preserves utm_source, utm_medium, utm_campaign, ref and promoter during client navigation without persistence or tracking. Without JavaScript links remain functional, but query propagation is not applied.

## Accessibility and SEO

Semantic headings, landmarks, labeled fields, fieldsets, native disclosures and dialogs, visible keyboard focus, a skip link, reduced-motion support and DOM alternatives to every scene. Decorative graphics have appropriate image labeling or empty alt. Image dimensions reserve layout space. Metadata identifies Lock City Clothes; preview robots remain noindex/nofollow. Production origin, canonical URLs, social imagery and product structured data await approved business content; do not publish invented Product/Offer schema. Re-enable indexing only as part of an approved launch.

## Performance and asset pipeline

Critical HTML and the local ~99 KiB city poster precede the optional scene chunks. Fonts use next/font (downloaded at build, locally served at runtime). Keep real photography as optimized AVIF/WebP with dimensions and responsive delivery once provided. Future GLB files need explicit geometry/texture budgets and disposal review before enabling any product viewer. No large texture or GLB is required by this facade. See VALIDATION.md for actual production build and browser findings; laboratory checks are not real-user Core Web Vitals.

## Known inherited debt and pending information

The inherited package manifest retains unused CRA, backend-adjacent and UI dependencies. They are not automatically part of browser bundles; wholesale removal is outside this targeted pass. Dormant analytics/attribution/newsletter utilities are not imported by the active layout or facade. The older npm lockfile is superseded by yarn.lock; use Yarn consistently.

[INFORMATION PENDING]: approved product catalog/media/variants/prices/stock; real drop schedule; archive history; people and consented assets; editorial content; shipping/returns rules; production origin and launch metadata. These are BLOCKED BY PHASE 2 DATA / COMMERCE. No business facts have been invented.
