import type { Product, ProductStatus, ProductVariant, ProductAvailability, ProductCategory, ProductAttribute, ProductImage } from "./types";

export type CommerceErrorKind = "network" | "woocommerce" | "configuration";
export class CommerceError extends Error {
  constructor(public kind: CommerceErrorKind, message: string, public httpStatus?: number) {
    super(message);
    this.name = "CommerceError";
  }
}

export interface StoreApiProduct extends ProductAvailability {
  id: number;
  parent?: number;
  name: string;
  slug: string;
  type: string;
  sku?: string;
  variation?: string;
  has_options?: boolean;
  short_description?: string;
  description?: string;
  images?: ProductImage[];
  categories?: ProductCategory[];
  attributes?: ProductAttribute[];
  prices: {
    price: string;
    currency_code: string;
    currency_minor_unit: number;
    price_range?: { min_amount: string; max_amount: string } | null;
  };
  variations?: { id: number; attributes?: { name: string; value: string }[] }[];
}

function availability(raw: ProductAvailability): ProductAvailability {
  return {
    is_in_stock: raw.is_in_stock, is_purchasable: raw.is_purchasable,
    is_on_backorder: raw.is_on_backorder, stock_status: raw.stock_status,
    low_stock_remaining: raw.low_stock_remaining, stock_availability: raw.stock_availability,
  };
}
function status(raw: ProductAvailability): ProductStatus {
  if (raw.is_in_stock === false) return "SOLD_OUT";
  if (raw.is_on_backorder === true && raw.is_purchasable === true) return "PRE_ORDER";
  if (raw.is_in_stock === true && raw.is_purchasable === true) return "AVAILABLE";
  return "UNKNOWN";
}
function money(value: string, minor: number) {
  if (typeof value !== "string" || !/^\d+$/.test(value) || !Number.isInteger(minor) || minor < 0 || minor > 6) {
    throw new CommerceError("woocommerce", "Invalid price returned by WooCommerce");
  }
  return Number(value) / 10 ** minor;
}
function stripHtml(value?: string) { return value?.replace(/<[^>]*>/g, "").trim() || undefined; }

export function mapProduct(raw: StoreApiProduct): Product {
  if (!Number.isInteger(raw.id) || !raw.slug || !raw.name || !raw.type || !raw.prices?.currency_code) {
    throw new CommerceError("woocommerce", "Invalid product returned by WooCommerce");
  }
  const price = money(raw.prices.price, raw.prices.currency_minor_unit);
  const variants: ProductVariant[] = (raw.variations ?? []).map((v) => ({
    id: `woo-${v.id}`, wooVariationId: v.id,
    size: v.attributes?.find((a) => /size|talla/i.test(a.name))?.value ?? "OS",
    color: v.attributes?.find((a) => /colou?r/i.test(a.name))?.value,
    attributes: v.attributes ?? [], status: "UNKNOWN", detailsState: "unresolved",
  }));
  if (raw.type === "simple") variants.push({
    id: `woo-${raw.id}-default`, size: "OS", status: status(raw), price,
    currency: raw.prices.currency_code, detailsState: "resolved", availability: availability(raw), attributes: [],
  });
  return {
    id: `woo-${raw.id}`, wooProductId: raw.id, type: raw.type,
    name: raw.name, slug: raw.slug, sku: raw.sku, price, currency: raw.prices.currency_code,
    priceRange: raw.prices.price_range ? {
      min: money(raw.prices.price_range.min_amount, raw.prices.currency_minor_unit),
      max: money(raw.prices.price_range.max_amount, raw.prices.currency_minor_unit),
    } : undefined,
    sourceImages: raw.images ?? [],
    images: (raw.images ?? []).map((i) => `/store/media?src=${encodeURIComponent(i.src)}`),
    categories: raw.categories ?? [], attributes: raw.attributes ?? [],
    category: raw.categories?.[0]?.slug, collection: raw.categories?.[0]?.slug,
    hasOptions: raw.has_options ?? raw.type === "variable", variation: raw.variation,
    status: status(raw), availability: availability(raw), variants,
    description: stripHtml(raw.short_description) ?? stripHtml(raw.description),
  };
}

// Instantiated only by the server-only commerce entry point.
export class WooCommerceAdapter {
  constructor(private baseUrl?: string, private request: typeof fetch = fetch) {}

  private async fetchStore(path: string) {
    if (!this.baseUrl) throw new CommerceError("configuration", "WC_STORE_URL is not configured");
    let url: URL;
    try { url = new URL(`${this.baseUrl.replace(/\/$/, "")}/wp-json/wc/store/v1${path}`); }
    catch { throw new CommerceError("configuration", "WC_STORE_URL is invalid"); }
    let response: Response;
    try {
      response = await this.request(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
    } catch { throw new CommerceError("network", "Could not reach WooCommerce"); }
    if (!response.ok) throw new CommerceError("woocommerce", `WooCommerce returned HTTP ${response.status}`, response.status);
    let data: unknown;
    try { data = await response.json(); }
    catch { throw new CommerceError("woocommerce", "WooCommerce returned invalid JSON"); }
    return { data, headers: response.headers };
  }

  // Explicit totals plus a headerless fallback. Never return a partial catalog.
  private async list(params: URLSearchParams) {
    const items: StoreApiProduct[] = [];
    const ids = new Set<number>();
    const perPage = 100;
    let expectedTotal: number | undefined;
    let expectedPages: number | undefined;
    for (let page = 1; ; page++) {
      params.set("per_page", String(perPage));
      params.set("page", String(page));
      params.set("orderby", "id");
      params.set("order", "asc");
      const { data, headers } = await this.fetchStore(`/products?${params}`);
      if (!Array.isArray(data)) throw new CommerceError("woocommerce", "Invalid catalog response");
      for (const [header, previous] of [["x-wp-total", expectedTotal], ["x-wp-totalpages", expectedPages]] as const) {
        const value = headers.get(header);
        if (value !== null) {
          const total = Number(value);
          if (!/^\d+$/.test(value) || (previous !== undefined && previous !== total)) {
            throw new CommerceError("woocommerce", "Catalog pagination changed; retry the request");
          }
          if (header === "x-wp-total") expectedTotal = total;
          else expectedPages = total;
        }
      }
      for (const item of data as StoreApiProduct[]) {
        if (!Number.isInteger(item.id) || ids.has(item.id)) throw new CommerceError("woocommerce", "Invalid or repeated catalog page");
        ids.add(item.id);
        items.push(item);
      }
      if (expectedPages !== undefined ? page >= expectedPages : data.length < perPage) break;
      if (!data.length) throw new CommerceError("woocommerce", "Incomplete catalog pagination");
    }
    if (expectedTotal !== undefined && items.length !== expectedTotal) throw new CommerceError("woocommerce", "Incomplete catalog response");
    return items;
  }

  async getProducts() { return (await this.list(new URLSearchParams())).map(mapProduct); }
  async getProductBySlug(slug: string) {
    const raw = await this.list(new URLSearchParams({ slug }));
    const match = raw.find((p) => p.slug === slug);
    return match ? mapProduct(match) : undefined;
  }
  async getProductsByCollection(slug: string) {
    return (await this.getProducts()).filter((p) => p.categories.some((c) => c.slug === slug));
  }

  // Prepared for a later variant-selection step; no parent stock/price fallback.
  async getVariationById(parentId: number, variant: ProductVariant): Promise<ProductVariant> {
    if (!variant.wooVariationId) throw new CommerceError("woocommerce", "Missing variation ID");
    const { data } = await this.fetchStore(`/products/${variant.wooVariationId}`);
    const raw = data as StoreApiProduct;
    if (!raw || raw.id !== variant.wooVariationId || raw.parent !== parentId || raw.type !== "variation") {
      throw new CommerceError("woocommerce", "Unexpected variation response");
    }
    const product = mapProduct(raw);
    return { ...variant, status: product.status, price: product.price, currency: product.currency,
      sku: raw.sku, availability: availability(raw), detailsState: "resolved" };
  }
}
