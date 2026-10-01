import "server-only";
import { CommerceError } from "./commerce-core";
import { AW26_PRODUCT_ID_BY_SLUG } from "./merchandising";
import type {
  Product,
  ProductAttribute,
  ProductAvailability,
  ProductCategory,
  ProductImage,
  ProductVariant,
} from "./types";

interface OperatorImage {
  id?: number;
  src?: string;
  alt?: string;
}

interface OperatorAttribute {
  id?: number;
  name?: string;
  options?: string[];
  variation?: boolean;
}

interface OperatorVariation {
  id?: number;
  status?: string;
  color?: string;
  size?: string;
  attributes?: { name?: string; option?: string }[];
  regular_price?: string;
  sale_price?: string;
  stock_status?: string;
  stock_quantity?: number | null;
  sku?: string;
}

interface OperatorProduct {
  id?: number;
  name?: string;
  slug?: string;
  status?: string;
  type?: string;
  catalog_visibility?: string;
  description?: string;
  short_description?: string;
  regular_price?: string;
  sale_price?: string;
  sku?: string;
  stock_status?: string;
  stock_quantity?: number | null;
  images?: OperatorImage[];
  categories?: ProductCategory[];
  attributes?: OperatorAttribute[];
  variations?: OperatorVariation[];
}

function plainText(value?: string): string | undefined {
  const text = value
    ?.replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
  return text || undefined;
}

function price(value?: string): number | undefined {
  if (!value) return undefined;
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) {
    throw new CommerceError("woocommerce", "Invalid AW26 price returned by Operator API");
  }
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : undefined;
}

function effectivePrice(regular?: string, sale?: string): number | undefined {
  return price(sale) ?? price(regular);
}

function imageProxy(src: string): string {
  return `/store/media?src=${encodeURIComponent(src)}`;
}

function slug(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function availability(stockStatus?: string): ProductAvailability {
  const inStock = stockStatus === "instock";
  return {
    is_in_stock: inStock,
    is_purchasable: false,
    is_on_backorder: stockStatus === "onbackorder",
    stock_status: stockStatus,
  };
}

function mapAttributes(attributes: OperatorAttribute[] = []): ProductAttribute[] {
  return attributes.flatMap((attribute, attributeIndex) => {
    if (!attribute.name || !Array.isArray(attribute.options)) return [];
    return [{
      id: Number.isInteger(attribute.id) ? attribute.id! : attributeIndex,
      name: attribute.name,
      has_variations: attribute.variation === true,
      terms: attribute.options.map((option, optionIndex) => ({
        id: optionIndex,
        name: option,
        slug: slug(option),
      })),
    }];
  });
}

function mapVariant(raw: OperatorVariation, parentId: number): ProductVariant | undefined {
  if (!Number.isInteger(raw.id)) return undefined;
  const attributes = (raw.attributes ?? []).flatMap((attribute) => (
    attribute.name && attribute.option ? [{ name: attribute.name, value: attribute.option }] : []
  ));
  const amount = effectivePrice(raw.regular_price, raw.sale_price);
  return {
    id: `woo-${raw.id}`,
    wooVariationId: raw.id,
    parentWooProductId: parentId,
    sku: raw.sku || undefined,
    color: raw.color || attributes.find((item) => /colou?r/i.test(item.name))?.value,
    size: raw.size || attributes.find((item) => /size|talla/i.test(item.name))?.value || "OS",
    attributes,
    price: amount,
    regularPrice: price(raw.regular_price),
    salePrice: price(raw.sale_price),
    currency: "USD",
    status: "COMING_SOON",
    availability: availability(raw.stock_status),
    detailsState: "resolved",
  };
}

export function mapOperatorProduct(raw: OperatorProduct): Product {
  if (!Number.isInteger(raw.id) || !raw.name || !raw.slug || !raw.type) {
    throw new CommerceError("woocommerce", "Invalid AW26 product returned by Operator API");
  }
  if (raw.status !== "draft" || raw.catalog_visibility !== "hidden") {
    throw new CommerceError("woocommerce", "AW26 product is not safely hidden in WooCommerce");
  }

  const sourceImages: ProductImage[] = (raw.images ?? []).flatMap((image) => (
    image.src ? [{ id: image.id, src: image.src, alt: image.alt }] : []
  ));
  let variants = (raw.variations ?? []).flatMap((variant) => {
    const mapped = mapVariant(variant, raw.id!);
    return mapped ? [mapped] : [];
  });
  if (raw.type === "simple") {
    const amount = effectivePrice(raw.regular_price, raw.sale_price);
    variants = [{
      id: `woo-${raw.id}-default`,
      size: "OS",
      status: "COMING_SOON",
      price: amount,
      regularPrice: price(raw.regular_price),
      salePrice: price(raw.sale_price),
      currency: "USD",
      detailsState: "resolved",
      availability: availability(raw.stock_status),
      attributes: [],
    }];
  }
  const prices = variants.map((variant) => variant.price).filter((value): value is number => value !== undefined);
  if (prices.length === 0) {
    throw new CommerceError("woocommerce", "AW26 product has no valid retail price");
  }
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const inStock = variants.some((variant) => variant.availability?.is_in_stock === true);
  const categories = Array.isArray(raw.categories) ? raw.categories : [];

  return {
    id: `woo-${raw.id}`,
    wooProductId: raw.id,
    type: raw.type,
    name: raw.name,
    slug: raw.slug,
    sku: raw.sku || undefined,
    price: minPrice,
    priceRange: minPrice === maxPrice ? undefined : { min: minPrice, max: maxPrice },
    currency: "USD",
    sourceImages,
    images: sourceImages.map((image) => imageProxy(image.src)),
    categories,
    attributes: mapAttributes(raw.attributes),
    category: categories[0]?.slug,
    collection: "aw26",
    hasOptions: raw.type === "variable",
    status: "COMING_SOON",
    availability: {
      is_in_stock: inStock,
      is_purchasable: false,
      stock_status: inStock ? "instock" : "outofstock",
    },
    shortDescription: plainText(raw.short_description),
    description: plainText(raw.description),
    previewOnly: true,
    variants,
  };
}

function operatorConfig(): { baseUrl: string; token: string } {
  const baseUrl = process.env.OPERATOR_API_URL?.trim();
  const token = process.env.OPERATOR_API_TOKEN?.trim();
  if (!baseUrl || !token) {
    throw new CommerceError("configuration", "AW26 preview connection is not configured");
  }
  let parsed: URL;
  try { parsed = new URL(baseUrl); }
  catch { throw new CommerceError("configuration", "AW26 preview URL is invalid"); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new CommerceError("configuration", "AW26 preview URL is invalid");
  }
  return { baseUrl: parsed.origin, token };
}

async function operatorFetch(path: string): Promise<unknown> {
  const { baseUrl, token } = operatorConfig();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/operator/v1${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(60000),
    });
  } catch {
    throw new CommerceError("network", "Could not reach AW26 preview service");
  }
  if (!response.ok) {
    throw new CommerceError("woocommerce", `AW26 preview service returned HTTP ${response.status}`, response.status);
  }
  return response.json().catch(() => undefined);
}

const productCache = new Map<number, { expiresAt: number; product: Product }>();
const productInFlight = new Map<number, Promise<Product>>();
let catalogCache: { expiresAt: number; products: Product[] } | undefined;
let catalogInFlight: Promise<Product[]> | undefined;

export async function getOperatorProduct(productId: number): Promise<Product> {
  const cached = productCache.get(productId);
  if (cached && cached.expiresAt > Date.now()) return cached.product;
  const existing = productInFlight.get(productId);
  if (existing) return existing;
  const request = operatorFetch(`/aw26/products/${productId}`)
    .then((body) => mapOperatorProduct(body as OperatorProduct))
    .then((product) => {
      productCache.set(productId, { expiresAt: Date.now() + 300_000, product });
      return product;
    })
    .finally(() => productInFlight.delete(productId));
  productInFlight.set(productId, request);
  return request;
}

export async function getOperatorCatalog(productIds: readonly number[]): Promise<Product[]> {
  if (catalogCache && catalogCache.expiresAt > Date.now()) return catalogCache.products;
  if (!catalogInFlight) {
    catalogInFlight = operatorFetch("/aw26/products").then((body) => {
      const raw = (body as { products?: OperatorProduct[] })?.products;
      if (!Array.isArray(raw)) throw new CommerceError("woocommerce", "AW26 preview returned an invalid catalog");
      const products = raw.map(mapOperatorProduct);
      const byId = new Map(products.map((product) => [product.wooProductId!, product]));
      if (byId.size !== productIds.length || productIds.some((id) => !byId.has(id))) {
        throw new CommerceError("woocommerce", "AW26 preview returned an incomplete catalog");
      }
      const ordered = productIds.map((id) => byId.get(id)!);
      const expiresAt = Date.now() + 300_000;
      for (const product of ordered) productCache.set(product.wooProductId!, { expiresAt, product });
      catalogCache = { expiresAt, products: ordered };
      return ordered;
    }).finally(() => { catalogInFlight = undefined; });
  }
  return catalogInFlight;
}

export async function getOperatorProducts(productIds: readonly number[]): Promise<Product[]> {
  return Promise.all(productIds.map(getOperatorProduct));
}

export async function getOperatorProductBySlug(productSlug: string): Promise<Product | undefined> {
  const id = AW26_PRODUCT_ID_BY_SLUG[productSlug];
  return id ? getOperatorProduct(id) : undefined;
}
