import type { Collection, Drop, Product, Transmission } from "./types";

// ─────────────────────────────────────────────────────────────
// MOCK DATA — development content only. No real Lock City
// products, prices, stock or launch information is represented.
// ─────────────────────────────────────────────────────────────

const SIZES = ["XS", "S", "M", "L", "XL"];

function variants(productId: string, availableFrom = 0) {
  return SIZES.map((size, i) => ({
    id: `${productId}-${size}`,
    size,
    status: (i < availableFrom ? "SOLD_OUT" : "AVAILABLE") as Product["status"],
  }));
}

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "obj-0041",
    slug: "object-0041-monolith-hoodie",
    code: "OBJECT_0041",
    name: "MONOLITH HOODIE",
    price: 180,
    currency: "EUR",
    color: "CONCRETE",
    category: "HOODIES",
    status: "AVAILABLE",
    collection: "drop",
    description:
      "Heavyweight hooded silhouette. Boxy architectural cut, dropped shoulder, double-layer hood. MOCK DATA — development placeholder copy.",
    materials: "500GSM organic cotton [INFORMATION PENDING]",
    seed: 41,
    variants: variants("obj-0041", 1),
  },
  {
    id: "obj-0042",
    slug: "object-0042-scaffold-cargo",
    code: "OBJECT_0042",
    name: "SCAFFOLD CARGO",
    price: 210,
    currency: "EUR",
    color: "ASPHALT",
    category: "BOTTOMS",
    status: "AVAILABLE",
    collection: "drop",
    description:
      "Wide-leg cargo with structural pocket geometry. MOCK DATA — development placeholder copy.",
    materials: "Cotton ripstop [INFORMATION PENDING]",
    seed: 42,
    variants: variants("obj-0042"),
  },
  {
    id: "obj-0043",
    slug: "object-0043-signal-tee",
    code: "OBJECT_0043",
    name: "SIGNAL TEE",
    price: 85,
    currency: "EUR",
    color: "BONE",
    category: "T-SHIRTS",
    status: "PRE_ORDER",
    collection: "drop",
    description:
      "Midweight tee with chest transmission graphic. MOCK DATA — development placeholder copy.",
    materials: "240GSM cotton jersey [INFORMATION PENDING]",
    seed: 43,
    variants: variants("obj-0043"),
  },
  {
    id: "obj-0044",
    slug: "object-0044-gatekeeper-cap",
    code: "OBJECT_0044",
    name: "GATEKEEPER CAP",
    price: 65,
    currency: "EUR",
    color: "ONYX",
    category: "ACCESSORIES",
    status: "COMING_SOON",
    collection: "core",
    description:
      "Six-panel cap with tonal embroidery. MOCK DATA — development placeholder copy.",
    materials: "Brushed cotton twill [INFORMATION PENDING]",
    seed: 44,
    variants: [{ id: "obj-0044-OS", size: "OS", status: "COMING_SOON" }],
  },
  {
    id: "obj-0045",
    slug: "object-0045-perimeter-longsleeve",
    code: "OBJECT_0045",
    name: "PERIMETER LONGSLEEVE",
    price: 95,
    currency: "EUR",
    color: "GRAPHITE",
    category: "T-SHIRTS",
    status: "SOLD_OUT",
    collection: "core",
    description:
      "Long-sleeve with sleeve coordinate print. MOCK DATA — development placeholder copy.",
    materials: "220GSM cotton [INFORMATION PENDING]",
    seed: 45,
    variants: variants("obj-0045", 5),
  },
  {
    id: "obj-0046",
    slug: "object-0046-expansion-tote",
    code: "OBJECT_0046",
    name: "EXPANSION TOTE",
    price: 55,
    currency: "EUR",
    color: "RAW",
    category: "ACCESSORIES",
    status: "AVAILABLE",
    collection: "core",
    description:
      "Reinforced canvas tote, interior utility pocket. MOCK DATA — development placeholder copy.",
    materials: "18oz canvas [INFORMATION PENDING]",
    seed: 46,
    variants: [{ id: "obj-0046-OS", size: "OS", status: "AVAILABLE" }],
  },
];

export const MOCK_COLLECTIONS: Collection[] = [
  {
    slug: "core",
    districtIndex: "01",
    name: "CORE",
    tagline: "THE PERMANENT LINE",
    description:
      "Foundational objects. Always in the city. MOCK DATA — development placeholder.",
    seed: 11,
  },
  {
    slug: "drop",
    districtIndex: "02",
    name: "DROP",
    tagline: "TIME-LIMITED RELEASES",
    description:
      "The current drop. Available until it is not. MOCK DATA — development placeholder.",
    seed: 22,
  },
  {
    slug: "collab",
    districtIndex: "03",
    name: "COLLAB",
    tagline: "GUEST FREQUENCIES",
    description:
      "Collaborative objects with people of the city. MOCK DATA — development placeholder.",
    seed: 33,
  },
  {
    slug: "archive",
    districtIndex: "04",
    name: "ARCHIVE",
    tagline: "THE VAULT",
    description:
      "Previous releases, preserved. Not for sale. MOCK DATA — development placeholder.",
    seed: 44,
  },
];

export const MOCK_DROPS: Drop[] = [
  { id: "d1", code: "DROP_001", name: "[COLLECTION NAME — MOCK]", status: "ARCHIVED", season: "SS— MOCK" },
  { id: "d2", code: "DROP_002", name: "[COLLECTION NAME — MOCK]", status: "SOLD_OUT", season: "AW — MOCK" },
  { id: "d3", code: "DROP_003", name: "[COLLECTION NAME — MOCK]", status: "ARCHIVED", season: "SS — MOCK" },
  { id: "d4", code: "DROP_004", name: "[COLLECTION NAME — MOCK]", status: "SOLD_OUT", season: "AW — MOCK" },
  { id: "d5", code: "DROP_005", name: "[COLLECTION NAME — MOCK]", status: "ARCHIVED", season: "SS — MOCK" },
  { id: "d6", code: "DROP_006", name: "URBAN MONOLITH — MOCK", status: "AVAILABLE", season: "AW26 — MOCK" },
];

export const LATEST_DROP = MOCK_DROPS[5];

export const MOCK_TRANSMISSIONS: Transmission[] = [
  {
    id: "t9",
    code: "TRANSMISSION_009",
    category: "EDITORIAL",
    title: "CONCRETE AS CANVAS — MOCK",
    excerpt: "[CONTENT PENDING] Editorial placeholder on the relationship between garment and structure.",
    minutes: 6,
    seed: 71,
  },
  {
    id: "t10",
    code: "TRANSMISSION_010",
    category: "FILM",
    title: "NIGHT PERIMETER — MOCK",
    excerpt: "[CONTENT PENDING] Film placeholder. [LOCK CITY VIDEO PENDING].",
    minutes: 3,
    seed: 72,
  },
  {
    id: "t11",
    code: "TRANSMISSION_011",
    category: "CITY",
    title: "DISTRICT REPORT 04 — MOCK",
    excerpt: "[CONTENT PENDING] Field notes from the archive district.",
    minutes: 4,
    seed: 73,
  },
];

export const MOCK_PEOPLE = [
  { id: "p1", ref: "CITIZEN_001", role: "[PROFILE PENDING]", district: "01", seed: 81 },
  { id: "p2", ref: "CITIZEN_002", role: "[PROFILE PENDING]", district: "02", seed: 82 },
  { id: "p3", ref: "CITIZEN_003", role: "[PROFILE PENDING]", district: "03", seed: 83 },
  { id: "p4", ref: "CITIZEN_004", role: "[PROFILE PENDING]", district: "04", seed: 84 },
];
