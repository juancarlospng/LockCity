import type { Product, ProductStatus, ProductVariant } from "./types";

// ─────────────────────────────────────────────────────────────
// COMMERCE ADAPTER LAYER
// The UI only talks to CommerceAdapter. WooCommerce (Store API) is
// the production source of truth for catalog/prices/stock. When no
// store is configured the adapter is EmptyCommerceAdapter and the UI
// renders honest empty states — never fabricated products.
// ─────────────────────────────────────────────────────────────

export interface CommerceAdapter {
  readonly live: boolean;
  getProducts(): Promise<Product[]>;
  getProductBySlug(slug: string): Promise<Product | undefined>;
  getProductsByCollection(slug: string): Promise<Product[]>;
}

// --- WooCommerce Store API mapping ---

interface StoreApiImage {
  src?: string;
}
interface StoreApiProduct {
  id: number;
  name: string;
  slug: string;
  type: string;
  sku?: string;
  is_in_stock?: boolean;
  short_description?: string;
  description?: string;
  images?: StoreApiImage[];
  categories?: { slug: string }[];
  prices?: { price?: string; currency_code?: string; currency_minor_unit?: number };
  variations?: { id: number; attributes?: { name: string; value: string }[] }[];
}

function stripHtml(html?: string) {
  return html ? html.replace(/<[^>]*>/g, "").trim() : undefined;
}

function mapPrice(raw?: string, minorUnit = 2) {
  const n = Number(raw ?? "0");
  return Number.isFinite(n) ? n / 10 ** minorUnit : 0;
}

function mapProduct(raw: StoreApiProduct): Product {
  const minor = raw.prices?.currency_minor_unit ?? 2;
  const variants: ProductVariant[] = (raw.variations ?? []).map((v) => {
    const sizeAttr = v.attributes?.find((a) => /size|talla/i.test(a.name));
    return {
      id: `woo-${v.id}`,
      wooVariationId: v.id,
      size: sizeAttr?.value ?? "OS",
      // Per-variation stock/price requires the variation endpoint;
      // resolved server-side at cart/checkout time via the Store API.
      status: "AVAILABLE" as ProductStatus,
    };
  });
  if (variants.length === 0) {
    variants.push({ id: `woo-${raw.id}-default`, size: "OS", status: raw.is_in_stock ? "AVAILABLE" : "SOLD_OUT" });
  }
  return {
    id: `woo-${raw.id}`,
    wooProductId: raw.id,
    slug: raw.slug,
    name: raw.name,
    price: mapPrice(raw.prices?.price, minor),
    currency: raw.prices?.currency_code ?? "EUR",
    sku: raw.sku || undefined,
    category: raw.categories?.[0]?.slug,
    collection: raw.categories?.[0]?.slug,
    status: raw.is_in_stock ? "AVAILABLE" : "SOLD_OUT",
    description: stripHtml(raw.short_description) ?? stripHtml(raw.description),
    images: (raw.images ?? []).map((i) => i.src).filter(Boolean) as string[],
    variants,
  };
}

export class WooCommerceAdapter implements CommerceAdapter {
  readonly live = true;
  constructor(private baseUrl: string) {}

  private async fetchStore<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}/wp-json/wc/store/v1${path}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error(`WooCommerce Store API ${res.status}`);
    return res.json() as Promise<T>;
  }

  async getProducts() {
    try {
      const raw = await this.fetchStore<StoreApiProduct[]>("/products?per_page=100");
      return raw.map(mapProduct);
    } catch {
      // Fail closed to an empty catalog with honest UI, never fake data.
      return [];
    }
  }

  async getProductBySlug(slug: string) {
    try {
      const raw = await this.fetchStore<StoreApiProduct[]>(`/products?slug=${encodeURIComponent(slug)}`);
      return raw[0] ? mapProduct(raw[0]) : undefined;
    } catch {
      return undefined;
    }
  }

  async getProductsByCollection(slug: string) {
    const products = await this.getProducts();
    return products.filter((p) => p.collection === slug);
  }
}

export class EmptyCommerceAdapter implements CommerceAdapter {
  readonly live = false;
  async getProducts() {
    return [] as Product[];
  }
  async getProductBySlug() {
    return undefined;
  }
  async getProductsByCollection() {
    return [] as Product[];
  }
}

const storeUrl = process.env.NEXT_PUBLIC_WC_STORE_URL;
export const commerce: CommerceAdapter = storeUrl
  ? new WooCommerceAdapter(storeUrl)
  : new EmptyCommerceAdapter();
