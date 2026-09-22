import type { Product, ProductSizeGuideContent } from "./types";

export interface ProductContentDetail {
  title: string;
  body: string;
}

export interface ProductContent {
  displayName: string;
  shortDescription: string;
  description: string;
  details: ProductContentDetail[];
  sizeGuide?: ProductSizeGuideContent;
}

// Editorial presentation only. WooCommerce remains authoritative for every
// commercial field, including price, stock, availability, options and media.
export const PRODUCT_CONTENT: Readonly<Record<number, ProductContent>> = {
  2911: {
    displayName: "Lock Hoodie",
    shortDescription: "A heavyweight oversized hoodie with a clean silhouette and a soft brushed-fleece interior.",
    description: "Built for everyday comfort with a roomy shape, a clean hood and a substantial heavyweight feel.",
    details: [
      { title: "Materials", body: "60% Airlume combed and ring-spun cotton, 40% polyester fleece." },
      { title: "Fabric weight", body: "339 g/m² / 10 oz/yd²." },
      { title: "Fit", body: "Oversized, unisex fit." },
      { title: "Construction", body: "Brushed-fleece interior, double-layer hood without a drawcord and a front pocket." },
    ],
  },
  3011: {
    displayName: "LCC Organic High-Neck T-Shirt",
    shortDescription: "An organic cotton high-neck T-shirt with an oversized streetwear silhouette.",
    description: "A substantial organic cotton T-shirt defined by its wide collar, dropped shoulders and relaxed proportions.",
    details: [
      { title: "Materials", body: "100% organic combed ring-spun cotton." },
      { title: "Fabric weight", body: "200 g/m² / 5.9 oz/yd²." },
      { title: "Fit", body: "Oversized fit with dropped shoulders." },
      { title: "Construction", body: "Set-in sleeves, 1 × 1 rib collar and self-fabric tape inside the back neck." },
    ],
    sizeGuide: {
      sizes: ["S", "M", "L", "XL", "2XL"],
      measurements: [
        { label: "Length", valuesCm: [73, 75, 77, 80, 82.5] },
        { label: "Width", valuesCm: [63, 67, 71, 76, 81] },
        { label: "Sleeve", valuesCm: [24, 24.5, 25, 25.5, 26] },
      ],
      notes: [
        "US customers should order one size up.",
        "Measurements may vary by up to 5 cm / 2 in.",
      ],
    },
  },
  3058: {
    displayName: "LCC Heavyweight Long-Sleeve Shirt",
    shortDescription: "A heavyweight long-sleeve cotton shirt with a relaxed fit and substantial feel.",
    description: "A durable long-sleeve layer in heavyweight carded cotton, finished with wide ribbing at the neck and cuffs.",
    details: [
      { title: "Materials", body: "100% carded cotton." },
      { title: "Fabric weight", body: "278 g/m² / 8.2 oz/yd²." },
      { title: "Fit", body: "Relaxed fit." },
      { title: "Construction", body: "Side-seamed and preshrunk, with wide neck and cuff ribbing and double-needle hems." },
    ],
    sizeGuide: {
      sizes: ["S", "M", "L", "XL", "2XL", "3XL"],
      measurements: [
        { label: "Length", valuesCm: [70.485, 73.66, 76.2, 79.375, 82.55, 85.09] },
        { label: "Width", valuesCm: [52.07, 55.88, 59.69, 63.5, 67.945, 71.755] },
      ],
      notes: ["Measurements may vary by up to 5 cm / 2 in."],
    },
  },
  3149: {
    displayName: "LCC Crop Hoodie",
    shortDescription: "A cropped hoodie with dropped shoulders, a raw hem and matching drawstrings.",
    description: "A compact hoodie silhouette combining soft fleece with a cropped body and relaxed dropped shoulders.",
    details: [
      { title: "Materials", body: "52% Airlume combed and ring-spun cotton, 48% polyester fleece." },
      { title: "Fabric weight", body: "220.39 g/m² / 6.5 oz/yd²." },
      { title: "Fit", body: "Cropped body with dropped shoulders." },
      { title: "Construction", body: "Raw hem and dyed-to-match drawstrings." },
    ],
    sizeGuide: {
      sizes: ["S", "M", "L", "XL", "2XL"],
      measurements: [
        { label: "Length", valuesCm: [47.308, 49.213, 54.293, 56.198, 58.103] },
        { label: "Width", valuesCm: [55.88, 59.69, 64.77, 69.85, 74.93] },
      ],
      notes: ["Measurements may vary by up to 5 cm / 2 in."],
    },
  },
  3179: {
    displayName: "LCC Heavyweight Sweatpants",
    shortDescription: "Heavyweight fleece sweatpants with a relaxed, boxy shape and brushed interior.",
    description: "Roomy sweatpants built from substantial fleece, with practical pockets and a soft brushed interior.",
    details: [
      { title: "Materials", body: "60% cotton, 40% polyester fleece." },
      { title: "Fabric weight", body: "339 g/m² / 10 oz/yd²." },
      { title: "Fit", body: "Relaxed, boxy fit." },
      { title: "Construction", body: "Deep side pockets, elastic cuffs and an interior drawcord." },
    ],
    sizeGuide: {
      sizes: ["S", "M", "L", "XL", "2XL", "3XL"],
      measurements: [
        { label: "Inseam length", valuesCm: [74.93, 76.2, 77.47, 78.74, 80.01, 81.28] },
        { label: "Waistband", valuesCm: [35.56, 38.1, 41.91, 45.72, 49.53, 54.61] },
      ],
      notes: ["Measurements may vary by up to 5 cm / 2 in."],
    },
  },
  3214: {
    displayName: "Lock Ribbed Beanie",
    shortDescription: "A lightweight organic cotton ribbed beanie designed for everyday wear.",
    description: "A breathable ribbed beanie in soft organic cotton, finished with a classic folded cuff.",
    details: [
      { title: "Materials", body: "100% organic cotton." },
      { title: "Construction", body: "Ribbed knit with a folded cuff." },
    ],
    sizeGuide: {
      sizes: ["One Size"],
      measurements: [
        { label: "Total height", valuesCm: [22] },
        { label: "Cuff height", valuesCm: [7.5] },
        { label: "Width", valuesCm: [20] },
      ],
      circumference: {
        label: "Head circumference",
        cm: "41.9–58.4 cm",
        inches: "16.5–23 in",
      },
    },
  },
  3292: {
    displayName: "Lock City Oversized Heavyweight Hoodie",
    shortDescription: "A heavyweight oversized hoodie built around a clean, relaxed Lock City silhouette.",
    description: "A roomy everyday layer with a brushed interior, clean hood and substantial heavyweight structure.",
    details: [
      { title: "Materials", body: "60% Airlume combed and ring-spun cotton, 40% polyester fleece." },
      { title: "Fabric weight", body: "339 g/m² / 10 oz/yd²." },
      { title: "Fit", body: "Oversized, unisex fit." },
      { title: "Construction", body: "Brushed-fleece interior, double-layer hood without a drawcord and a front pocket." },
    ],
    sizeGuide: {
      sizes: ["S", "M", "L", "XL", "2XL", "3XL"],
      measurements: [
        { label: "Length", valuesCm: [71.12, 72.39, 74.93, 76.2, 77.47, 78.74] },
        { label: "Width", valuesCm: [54.61, 59.69, 64.77, 69.85, 74.93, 80.01] },
      ],
      notes: ["Measurements may vary by up to 5 cm / 2 in."],
    },
  },
  3686: {
    displayName: "White High-Neck LCC",
    shortDescription: "A white organic cotton high-neck T-shirt with an oversized fit.",
    description: "A clean high-neck T-shirt in substantial organic cotton, shaped with a wide collar and dropped shoulders.",
    details: [
      { title: "Materials", body: "100% organic combed ring-spun cotton." },
      { title: "Fabric weight", body: "200 g/m² / 5.9 oz/yd²." },
      { title: "Fit", body: "Oversized fit with dropped shoulders." },
      { title: "Construction", body: "Set-in sleeves, 1 × 1 rib collar and self-fabric tape inside the back neck." },
    ],
    sizeGuide: {
      sizes: ["S", "M", "L", "XL", "2XL"],
      measurements: [
        { label: "Length", valuesCm: [73, 75, 77, 80, 82.5] },
        { label: "Width", valuesCm: [63, 67, 71, 76, 81] },
        { label: "Sleeve", valuesCm: [24, 24.5, 25, 25.5, 26] },
      ],
      notes: [
        "US customers should order one size up.",
        "Measurements may vary by up to 5 cm / 2 in.",
      ],
    },
  },
  2415: {
    displayName: "Creador Henry × LCC Heavyweight Tee",
    shortDescription: "A heavyweight cotton tee created with Henry and cut in a structured regular fit.",
    description: "A substantial everyday T-shirt with a structured silhouette and soft ring-spun cotton construction.",
    details: [
      { title: "Materials", body: "100% combed ring-spun cotton." },
      { title: "Fabric weight", body: "220 g/m² / 6.5 oz/yd²." },
      { title: "Fit", body: "Regular, structured fit." },
      { title: "Construction", body: "Side-seamed with a 1 × 1 rib collar and single-needle edge stitching." },
    ],
    sizeGuide: {
      sizes: ["S", "M", "L", "XL", "2XL", "3XL", "4XL"],
      measurements: [
        { label: "Length", valuesCm: [74.93, 77.47, 80.01, 82.55, 85.09, 87.63, 90.17] },
        { label: "Width", valuesCm: [45.72, 50.8, 55.88, 60.96, 66.04, 71.12, 76.2] },
      ],
    },
  },
  3699: {
    displayName: "SOUL LAYER Corduroy Cap",
    shortDescription: "A low-profile corduroy cap with an adjustable metal buckle.",
    description: "A soft cotton corduroy cap with an understated six-panel shape and adjustable back strap.",
    details: [
      { title: "Materials", body: "100% cotton corduroy, with a cotton twill sweatband and taping." },
      { title: "Fit", body: "Unstructured, six-panel, low-profile fit with an adjustable strap." },
      { title: "Construction", body: "Six eyelets and a gold-coloured metal buckle." },
    ],
    sizeGuide: {
      circumference: {
        label: "Head circumference",
        cm: "50.8–56 cm",
        inches: "20–22 in",
      },
    },
  },
  3704: {
    displayName: "SOUL PIECE Cap",
    shortDescription: "A structured five-panel cap with a mid-profile fit and adjustable snap closure.",
    description: "A clean five-panel cap with a structured front, slightly curved visor and balanced mid-profile shape.",
    details: [
      { title: "Materials", body: "65% polyester, 35% cotton." },
      { title: "Fit", body: "Structured, five-panel, mid-profile fit." },
      { title: "Construction", body: "Adjustable snap closure with a matching fabric undervisor and sweatband." },
    ],
  },
};

export const PRODUCT_CONTENT_IDS = Object.freeze(
  Object.keys(PRODUCT_CONTENT).map(Number),
);

export function productContent(productId?: number): ProductContent | undefined {
  return productId === undefined ? undefined : PRODUCT_CONTENT[productId];
}

export function applyProductContent(product: Product): Product {
  const content = productContent(product.wooProductId);
  if (!content) return product;
  return {
    ...product,
    name: content.displayName,
    shortDescription: content.shortDescription,
    description: content.description,
    details: content.details.map((detail) => ({ ...detail })),
    sizeGuide: content.sizeGuide,
  };
}
