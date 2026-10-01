import type { Product } from "./types";

// Temporary launch merchandising. WooCommerce remains the source of truth for
// every commercial field; this file controls storefront visibility only.
export const CORE_PRODUCT_IDS = [2911, 3011, 3058, 3149, 3179, 3214, 3292, 3686] as const;
export const SHOP_EXTRA_PRODUCT_IDS = [2415, 3699, 3704] as const;
export const AW26_PRODUCT_IDS = [
  3823, 3854, 3915, 3932, 3941, 3950, 3973, 3979,
  3996, 4005, 4022, 4040, 4048, 4067, 4084, 4093, 4143,
] as const;
export const AW26_EXCLUDED_PRODUCT_IDS = [3923, 4102] as const;
export const AW26_BLOCKED_PRODUCT_IDS: Readonly<Record<number, string>> = {
  3923: "BLOCKED_PENDING_PRINTFUL_CORRECTION",
};
export const AW26_PRODUCT_ID_BY_SLUG: Readonly<Record<string, number>> = {
  "lane-seven-ls14014-premium-1-4-zip-sweatshirt": 3823,
  "oversized-heavyweight-hoodie": 3854,
  "lockmark-ribbed-beanie": 3915,
  "lockmark-luxe-bra": 3932,
  "lockmark-fleece-shorts": 3941,
  "lock-city-mascot-kid-hoodie": 3950,
  "lockmark-embroidered-socks": 3973,
  "lockmark-t-shirt": 3979,
  "lockmark-athletic-shorts": 3996,
  "dreamers-crest-sweater": 4005,
  "lockmark-sport-shirt": 4022,
  "lc-code-corduroy-cap": 4040,
  "lockmark-windbreaker": 4048,
  "lc-ice-day-sweatshirt": 4067,
  "lockmark-athletic-shorts-2": 4084,
  "lockmark-corduroy-cap": 4093,
  "unisex-fleece-sweatpants": 4143,
};

// Vercel is the current QA storefront. WooCommerce products remain draft and
// hidden; V2 reads their preview data server-side through Operator API.
export const AW26_VISIBLE = true;
export const DROP_VISIBLE = true;
export const ACTIVE_DROP_PRODUCT_IDS: readonly number[] = DROP_VISIBLE ? AW26_PRODUCT_IDS : [];
export const LEGACY_PRODUCT_IDS = [
  3745, 3709, 3673, 3633, 3621, 3609, 3351,
  3280, 3268, 3256, 3244, 3232, 2218, 2206,
] as const;

export const PUBLIC_STORE_PRODUCT_IDS: readonly number[] = [
  ...CORE_PRODUCT_IDS,
  ...SHOP_EXTRA_PRODUCT_IDS,
  ...ACTIVE_DROP_PRODUCT_IDS,
];

const coreIds = new Set<number>(CORE_PRODUCT_IDS);
const shopExtraIds = new Set<number>(SHOP_EXTRA_PRODUCT_IDS);
const aw26Ids = new Set<number>(AW26_PRODUCT_IDS);
const excludedAw26Ids = new Set<number>(AW26_EXCLUDED_PRODUCT_IDS);
const activeDropIds = new Set<number>(ACTIVE_DROP_PRODUCT_IDS);
const legacyIds = new Set<number>(LEGACY_PRODUCT_IDS);

export function isCoreProduct(id?: number): boolean {
  return typeof id === "number" && coreIds.has(id);
}

export function isShopExtraProduct(id?: number): boolean {
  return typeof id === "number" && shopExtraIds.has(id);
}

export function isActiveDropProduct(id?: number): boolean {
  return typeof id === "number" && activeDropIds.has(id);
}

export function isAw26Product(id?: number): boolean {
  return typeof id === "number" && aw26Ids.has(id);
}

export function isExcludedAw26Product(id?: number): boolean {
  return typeof id === "number" && excludedAw26Ids.has(id);
}

export function isLegacyProduct(id?: number): boolean {
  return typeof id === "number" && legacyIds.has(id);
}

export function isPublicStoreProduct(id?: number): boolean {
  return isCoreProduct(id) || isShopExtraProduct(id) || isActiveDropProduct(id);
}

function productsInOrder(products: Product[], ids: readonly number[]): Product[] {
  const byId = new Map(products.map((product) => [product.wooProductId, product]));
  return ids.flatMap((id) => {
    const product = byId.get(id);
    return product ? [product] : [];
  });
}

export function coreProducts(products: Product[]): Product[] {
  return productsInOrder(products, CORE_PRODUCT_IDS);
}

export function shopExtraProducts(products: Product[]): Product[] {
  return productsInOrder(products, SHOP_EXTRA_PRODUCT_IDS);
}

export function activeDropProducts(products: Product[]): Product[] {
  return productsInOrder(products, ACTIVE_DROP_PRODUCT_IDS);
}

export function aw26Products(products: Product[]): Product[] {
  return productsInOrder(products, AW26_PRODUCT_IDS);
}

export function publicStoreProducts(products: Product[]): Product[] {
  return productsInOrder(products, PUBLIC_STORE_PRODUCT_IDS);
}

export function selectedShopProducts(products: Product[], limit = 6): Product[] {
  const core = coreProducts(products).slice(0, 3);
  const extras = shopExtraProducts(products);
  const selected: Product[] = [];
  const length = Math.max(core.length, extras.length);
  for (let index = 0; index < length; index += 1) {
    if (core[index]) selected.push(core[index]);
    if (extras[index]) selected.push(extras[index]);
  }
  return selected.slice(0, limit);
}

export function relatedStoreProducts(product: Product, products: Product[], limit = 3): Product[] {
  const id = product.wooProductId;
  let candidates: Product[] = [];
  if (isCoreProduct(id)) candidates = coreProducts(products);
  else if (isActiveDropProduct(id)) candidates = activeDropProducts(products);
  else if (isShopExtraProduct(id)) candidates = publicStoreProducts(products);
  return candidates.filter((candidate) => candidate.wooProductId !== id).slice(0, limit);
}

export function relatedStoreProductIds(product: Product, limit = 3): number[] {
  const id = product.wooProductId;
  const ids = isCoreProduct(id) ? CORE_PRODUCT_IDS
    : isActiveDropProduct(id) ? AW26_PRODUCT_IDS
      : isShopExtraProduct(id) ? PUBLIC_STORE_PRODUCT_IDS : [];
  return ids.filter((candidate) => candidate !== id).slice(0, limit);
}
