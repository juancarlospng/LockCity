# LOCK CITY V2 — Immersive Ecommerce Prototype

**THE CITY IS ALIVE.** LOCK CITY V2 is a digital place, not a conventional store.
Collections are DISTRICTS. Products are OBJECTS. Releases are DROPS. History lives
in the ARCHIVE. Editorial content is TRANSMISSIONS. Community is PEOPLE OF THE CITY.

> PROTOTYPE — all products, prices, drops, people and content are **MOCK DATA**.
> Unknown brand facts are marked `[INFORMATION PENDING]`.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Three.js + React Three Fiber + Drei (WebGL layer)
- framer-motion (reveals, micro-interactions) + lenis (smooth scroll)
- Tailwind CSS, next/font (Anton display + Space Mono utility), sonner (toasts)

## Run

```bash
yarn install
yarn start        # next dev on 0.0.0.0:3000 (supervisor-managed here)
yarn build        # production build
```

## Routes

| Route | Purpose |
| --- | --- |
| `/` | 11-scene cinematic homepage (00 Initialization → 10 Join The City) |
| `/shop` | All objects — filters (NEW / T-SHIRTS / HOODIES / BOTTOMS / ACCESSORIES), sort |
| `/collections/[slug]` | District page: `core`, `drop`, `collab`, `archive` |
| `/product/[slug]` | Product detail — gallery, size selector, add to bag, accordions |
| `/archive` | The vault — all past drops |
| `/city` | Brand manifesto placeholder |
| `/journal` | Transmissions index |

Cart is a global drawer (localStorage-persisted) with DEMO CHECKOUT.

## Design system

Pure monochrome: `#050505` bg, `#F1EFE9` bone text, `#222222` graphite borders,
`#747474` steel muted, `#101010` surfaces. No accent color — typography, light,
composition and motion carry the identity. Display type: Anton. Utility: Space Mono.

## Data safety

All commerce values are fictional development content, labeled MOCK DATA in the UI.
No real Lock City products, prices, dates, stock or people are represented.
No payment, email or fulfillment provider is connected.
