# LOCK CITY V2

First vertical prototype, built after reading `LOCK_CITY_V2_MASTER_BRIEF.md` in full. The original repository contained only that master; no existing application was replaced.

## Run locally

Use Node 22.13+ (Node 24 LTS recommended) and npm 10.5+. The installed Drei dependency includes camera-controls which requires Node 22; do not use the system Node 20 installation.

```sh
npm ci
npm run dev -- --hostname 127.0.0.1 --port 5190
```

Open http://127.0.0.1:5190. No environment variables, credentials or remote services are needed.

```sh
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

The E2E suite expects the local server on port 5190 and an installed Microsoft Edge. To use Playwright Chromium elsewhere, remove `channel: 'msedge'` in `playwright.config.ts` and install its browser. Production build is a static export under `out/`; serve that directory through a static HTTP server. `npm start` is a convenience alias for the local development server, not production hosting.

## Delivered scope

- Global HTML shell, CSS tokens, system display/utility typography and responsive navigation.
- Enter the City hero with local concept art and a lazy Three.js/R3F steel portal layer.
- Damped pointer camera, adaptive DPR, pause button, offscreen/hidden pause, context-loss/error fallback, mobile and reduced-motion static presentation.
- Native transition into a DOM Latest Drop placeholder and footer.
- Typed isolated MockCommerceAdapter with explicit DEMO / MOCK DATA.

No products, prices, stock, SKUs, dates or commercial rules were invented. No WooCommerce, Printful, Stripe, PayPal, authentication, checkout, customer data, production API or analytics is connected. No remote fonts/assets are requested. Only `/` is implemented; future routes are documented, not exposed as broken navigation.

## Design and operations

Read `ARCHITECTURE.md`, `DESIGN_SYSTEM.md`, `THREE_SYSTEM.md`, `API_INTEGRATION.md` and `PERFORMANCE.md`. Brand fonts, accent, official copy, campaign/product imagery, taxonomy, policies, domain, API contracts and business information: [INFORMATION PENDING]. Prototype metadata is deliberately noindex. The generated gateway is concept art, explicitly labeled; provenance and prompt are in `public/assets/README.md`.

This task prepares repository code and local preview. Publication and production deployment remain separate from the requested prototype.
