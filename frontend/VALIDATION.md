# Phase 1 — facade validation

Local production validation on Windows, 9 September 2026. These are laboratory and structural observations, not field metrics or commercial readiness certification.

## Verification

- Next.js 15.5.25 production build completes, including TypeScript validation.
- Explicit TypeScript check and ESLint complete without errors. The build emits a configuration advisory because the custom React/hooks/accessibility ESLint setup does not include the optional Next ESLint plugin.
- Browser suite uses installed Microsoft Edge with one worker. Final result: 10/10 passed in 34.5 seconds. Ten scenarios cover the primary routes, missing detail records, history/query navigation, responsive layout/dialogs, local join/cart, reduced motion/no JavaScript/no WebGL, WCAG automated scans, disabled endpoints, WebGL lifecycle and local-only requests.
- All 13 primary route variants are tested via direct load and refresh. The five empty product/editorial detail paths return 404 and retain their templates; this is intentional while no records exist.
- Viewports: 320x568, 390x844, 412x915, 768x1024 and desktop 1440x900. Overflow assertions include shop, product template, people, archive, transmissions and cart. Manual in-app review covered hero, mobile menu, shop and product; no physical iOS/Android device claim is made.
- Axe WCAG A/AA scans cover home, shop, product template, people, archive, transmissions and cart at 1440 and 390px. Zero detected violations. Native dialog focus trapping, Escape and focus restoration are checked separately. Automated scans are not a complete accessibility audit.
- The GPU scenario waits for the actual Three renderer before forcing context loss; idle/resume, offscreen unmount, navigation release, back-navigation remount and static fallback are checked. This is not a long-duration GPU heap proof.
- No external runtime requests are observed in the reduced-motion home session. Fonts are served locally. Both legacy service routes return 503. Join sends no POST and explicitly states that no email was saved or sent.

## Fixes found by validation

1. Fixed procedural Media sizing that expanded the document on 320px screens.
2. Removed the root loading boundary, which streamed missing-record responses as 200 and prevented useful no-JavaScript content.
3. Increased footer text contrast; retained the dark palette.
4. Hid decorative mobile navigation ordinals from accessible names.
5. Converted district DOM navigation to real links for no-JavaScript resilience.
6. Added a static tablet breakpoint below 1024px; actual enhancement also requires a fine pointer.
7. Rebuilt fonts after a development download failure; Anton and Space Mono are present in the production font stack.
8. Counted consistently slow frames in adaptive quality sampling while capping the first delta after idle.

## Build and asset observations

Next reports initial route JavaScript of 119 kB for home, 109 kB for shop, 110 kB for product templates and 108 kB for cart, with 103 kB shared. These are Next build figures, not total transfer budgets. Optional Three-related chunks are additional when enhancement mounts. The three largest chunks containing WebGL renderer code measured 382,774 / 359,552 / 147,943 bytes raw and 100,930 / 87,240 / 46,440 bytes gzip. Other R3F/scene chunks can add further cost. Mobile/reduced-motion sessions retain a static poster instead of mounting scenes.

The city poster is 101,648 bytes (~99 KiB), with explicit dimensions. No GLB assets, photographic texture stacks, shadows or postprocessing passes are required. Product images have reserved aspect ratios and error placeholders. No analytics, blocking splash loader or remote runtime font request is required.

LCP <=2.5s, CLS <=0.1 and INP <=200ms remain performance targets. No real-user measurements or throttled mobile Lighthouse scores have been claimed. Test real campaign/product assets, lower-powered GPUs and physical Safari/Android devices before production launch. The inherited dependency manifest contains unused CRA/UI dependencies; wholesale dependency removal was intentionally avoided. An upstream Three.Clock deprecation may appear in development; it is not a runtime failure.

## Structural scorecard

Internal review against Phase 1 scope, not user-research scores. 9 means structurally ready with the stated test limits; data-dependent visual completion is explicitly separated.

| Criterion | Assessment | Evidence / limit |
| --- | --- | --- |
| Brand clarity | 9/10 | Clothing brand name, purpose and shopping CTA lead |
| Clothing/store clarity | 9/10 | Shop, product and bag use familiar commerce language |
| Visual differentiation | 8/10 — BLOCKED BY PHASE 2 DATA / COMMERCE | City identity retained; real campaign and garment photography absent |
| The City coherence | 9/10 | Hero, districts and DOM cultural sections share one system |
| LOCKED IN integration | 9/10 | Approved mindset and all four statements retained |
| Navigation | 9/10 | Desktop/mobile routes, dialogs and history verified |
| Homepage hierarchy | 9/10 | All requested sections in order |
| Shop structure | 9/10 | Shared grid/cards, filter slot, loading and empty states; inventory blocked by Phase 2 |
| Product-page structure | 9/10 | Configurable details, variants and media; populated-record validation blocked by Phase 2 |
| Districts | 9/10 | Four existing routes, understandable metadata and native links |
| People | 9/10 | Index/profile and products-worn relationship; content blocked by Phase 2 |
| Archive | 9/10 | Typed history structure and restoration state; records blocked by Phase 2 |
| Transmissions | 9/10 | Editorial index, card and detail; content blocked by Phase 2 |
| Mobile UX | 9/10 | Four viewport sizes, touch dialogs and overflow checks; emulation only |
| Three.js integration | 9/10 | Deferred/conditional import, lifecycle and failure recovery verified |
| Accessibility | 9/10 | Automated scans and keyboard/dialog checks; not full assistive-technology certification |
| Future backend readiness | 9/10 | Replaceable local contracts and explicitly disabled integration edges |

## Remaining boundary

BLOCKED BY PHASE 2 DATA / COMMERCE: real inventory, media, variants/prices/availability, drop dates, people, historical archive, editorial records, shipping/returns policies and working commerce. These are not fabricated to fill the facade. Interactive product 3D, checkout and email capture are not active. Production indexing and origin metadata remain deliberately disabled/unset. The storefront is structurally prepared for a separately authorized integration phase.