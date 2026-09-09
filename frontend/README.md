# LOCK CITY CLOTHES — structural storefront facade

Next.js App Router storefront preserving THE CITY, districts and LOCKED IN. Phase 1 provides reusable shopping and editorial templates with intentional empty states. No production service is connected; adding environment variables does not enable commerce.

## Development

Use Node 22+ and Yarn 1.22.22 (the packageManager field is authoritative).

```sh
yarn install --frozen-lockfile
yarn start
yarn lint
yarn typecheck
yarn build
yarn serve
```

The default preview port is 3000. Fonts are fetched at build time by next/font, then served locally. No API credentials are required.

## Browser validation

Install Microsoft Edge (the test suite uses its installed browser channel), start the built app, then:

```sh
BASE_URL=http://127.0.0.1:3000 yarn test:e2e
```

In PowerShell set `$env:BASE_URL='http://127.0.0.1:3000'` before running `yarn test:e2e`. Tests cover routes, empty detail states, mobile layout, dialogs, query preservation, disabled integrations, accessibility and enhancement fallbacks. See VALIDATION.md for results and limitations.

## Integration boundary

Read ARCHITECTURE.md before changing data sources. lib/commerce.ts and lib/content.ts currently return no catalog or editorial records. Add to Bag and Checkout are disabled. Join never stores or sends an email. /store/\* and POST /join return 503. Backend and legacy utility files inherited from the repository are not part of the active facade runtime.

Real products, people, history, prices, release dates, shipping rules and launch configuration require approved Phase 2 data. Do not create substitute inventory or enable integrations as a shortcut.
