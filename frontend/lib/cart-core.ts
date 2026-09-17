import type { CartItem, Product, ProductVariant } from "./types";

export interface CartSnapshot {
  items: CartItem[];
  count: number;
  subtotal: number;
  total: number;
  currency: string;
}

export interface AddCartItemPayload {
  id: number;
  quantity: number;
  variation?: { attribute: string; value: string }[];
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class CartApiError extends Error {
  constructor(message: string, public readonly status?: number, public readonly code?: string) {
    super(message);
    this.name = "CartApiError";
  }
}

export const emptyCart = (): CartSnapshot => ({ items: [], count: 0, subtotal: 0, total: 0, currency: "USD" });

/** Prevent an older cart request from replacing a newer server-authoritative result. */
export class CartRequestEpoch {
  private value = 0;

  begin(): number { return ++this.value; }
  invalidate(): void { this.value += 1; }
  isCurrent(epoch: number): boolean { return epoch === this.value; }
}

function amount(value: unknown, minorUnit: unknown): number {
  const raw = typeof value === "string" || typeof value === "number" ? Number(value) : 0;
  const decimals = Number.isInteger(Number(minorUnit)) ? Number(minorUnit) : 2;
  return Number.isFinite(raw) ? raw / 10 ** decimals : 0;
}

function slugFromPermalink(value: unknown): string {
  if (typeof value !== "string") return "shop";
  try {
    const parts = new URL(value).pathname.split("/").filter(Boolean);
    const productIndex = parts.lastIndexOf("product");
    return decodeURIComponent(parts[productIndex + 1] ?? parts.at(-1) ?? "shop");
  } catch {
    return "shop";
  }
}

function imageProxy(value: unknown): string | undefined {
  return typeof value === "string" && value ? `/store/media?src=${encodeURIComponent(value)}` : undefined;
}

function mapAttributes(raw: unknown): { name: string; value: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Record<string, unknown>;
    return typeof item.attribute === "string" && typeof item.value === "string"
      ? [{ name: item.attribute, value: item.value }]
      : [];
  });
}

export function mapCart(raw: unknown): CartSnapshot {
  if (!raw || typeof raw !== "object") throw new CartApiError("WooCommerce returned an invalid cart.");
  const cart = raw as Record<string, unknown>;
  const totals = cart.totals && typeof cart.totals === "object" ? cart.totals as Record<string, unknown> : {};
  const currency = typeof totals.currency_code === "string" ? totals.currency_code : "USD";
  const minorUnit = totals.currency_minor_unit;
  const rawItems = Array.isArray(cart.items) ? cart.items : [];
  const items = rawItems.map((entry): CartItem => {
    if (!entry || typeof entry !== "object") throw new CartApiError("WooCommerce returned an invalid cart item.");
    const item = entry as Record<string, unknown>;
    const id = Number(item.id);
    const qty = Number(item.quantity);
    if (typeof item.key !== "string" || !Number.isInteger(id) || !Number.isFinite(qty)) {
      throw new CartApiError("WooCommerce returned an invalid cart item.");
    }
    const prices = item.prices && typeof item.prices === "object" ? item.prices as Record<string, unknown> : {};
    const lineTotals = item.totals && typeof item.totals === "object" ? item.totals as Record<string, unknown> : {};
    const variation = mapAttributes(item.variation);
    const isVariation = variation.length > 0 || item.type === "variation";
    const itemCurrency = typeof prices.currency_code === "string" ? prices.currency_code : currency;
    const itemMinorUnit = prices.currency_minor_unit ?? minorUnit;
    const limits = item.quantity_limits && typeof item.quantity_limits === "object" ? item.quantity_limits as Record<string, unknown> : {};
    const images = Array.isArray(item.images) ? item.images : [];
    const firstImage = images[0] && typeof images[0] === "object" ? images[0] as Record<string, unknown> : {};
    const findAttribute = (pattern: RegExp) => variation.find((attribute) => pattern.test(attribute.name))?.value;
    return {
      key: item.key,
      id,
      productId: isVariation ? undefined : id,
      variationId: isVariation ? id : undefined,
      type: isVariation ? "variation" : "simple",
      qty,
      quantityLimits: {
        minimum: Number(limits.minimum ?? 1), maximum: Number(limits.maximum ?? 9999),
        multipleOf: Number(limits.multiple_of ?? 1), editable: limits.editable !== false,
      },
      name: typeof item.name === "string" ? item.name : `Product ${id}`,
      slug: slugFromPermalink(item.permalink),
      sku: typeof item.sku === "string" ? item.sku : undefined,
      price: amount(prices.price, itemMinorUnit),
      regularPrice: amount(prices.regular_price, itemMinorUnit),
      salePrice: amount(prices.sale_price, itemMinorUnit),
      subtotal: amount(lineTotals.line_subtotal, lineTotals.currency_minor_unit ?? itemMinorUnit),
      total: amount(lineTotals.line_total, lineTotals.currency_minor_unit ?? itemMinorUnit),
      currency: itemCurrency,
      attributes: variation,
      size: findAttribute(/size|talla/i), color: findAttribute(/colou?r/i),
      image: imageProxy(firstImage.src),
    };
  });
  return {
    items,
    count: Number(cart.items_count ?? items.reduce((sum, item) => sum + item.qty, 0)),
    subtotal: amount(totals.total_items, minorUnit),
    total: amount(totals.total_price, minorUnit),
    currency,
  };
}

export function buildAddItemPayload(product: Product, variant: ProductVariant): AddCartItemPayload {
  if (product.type === "variable") {
    if (!variant.wooVariationId || variant.detailsState !== "resolved") throw new CartApiError("Select a valid product variation.");
    const selected = variant.attributes ?? [];
    if (selected.length === 0) throw new CartApiError("The selected variation has no attributes.");
    return {
      id: variant.wooVariationId,
      quantity: 1,
      variation: selected.map((attribute) => {
        const definition = product.attributes.find((candidate) => candidate.name.toLocaleLowerCase() === attribute.name.toLocaleLowerCase());
        const term = definition?.terms.find((candidate) => candidate.name.toLocaleLowerCase() === attribute.value.toLocaleLowerCase());
        return {
          attribute: definition?.taxonomy || definition?.name || attribute.name,
          value: definition?.taxonomy ? term?.slug ?? attribute.value : attribute.value,
        };
      }),
    };
  }
  if (!product.wooProductId) throw new CartApiError("This product has no WooCommerce ID.");
  return { id: product.wooProductId, quantity: 1 };
}

function readableError(payload: unknown, fallback: string): { message: string; code?: string } {
  if (!payload || typeof payload !== "object") return { message: fallback };
  const body = payload as Record<string, unknown>;
  const raw = typeof body.message === "string" ? body.message : fallback;
  const message = raw.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  return { message: message || fallback, code: typeof body.code === "string" ? body.code : undefined };
}

export function cartErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "We couldn’t update your bag. Please try again.";
  const code = error instanceof CartApiError ? (error.code ?? "").toLocaleLowerCase() : "";
  const detail = error.message.toLocaleLowerCase();

  if (/billing region/.test(detail)) return "Select the billing region.";
  if (/shipping region/.test(detail)) return "Select the shipping region.";
  if (/calculate shipping/.test(detail)) return "Enter your address to calculate shipping before continuing.";
  if (/shipping rate|shipping method|shipping package/.test(detail)) return "Shipping is currently unavailable for this destination.";
  if (/out.of.stock|stock/.test(code) || /out of stock|sold out/.test(detail)) return "This item is currently out of stock.";
  if (/quantity/.test(code) || /quantity/.test(detail)) return "That quantity is currently unavailable.";
  if (/variation/.test(code) || /variation|combination|option/.test(detail)) return "This option is currently unavailable.";
  if (/checkout_execution_disabled|redirect|payment|gateway/.test(`${code} ${detail}`)) {
    return "We couldn’t start your payment. Please try again later.";
  }
  if (/network|reach|connect|fetch/.test(`${code} ${detail}`)) return "We’re having trouble connecting. Please try again.";
  if (/empty/.test(detail)) return "Your bag is empty.";
  return "We couldn’t update your bag. Please try again.";
}

export class WooCartClient {
  constructor(private readonly fetcher: Fetcher = (input, init) => fetch(input, init)) {}

  private async request(method: string, path: string, body?: unknown): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetcher(`/store/${path}`, {
        method, credentials: "include", cache: "no-store",
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new CartApiError("Could not reach WooCommerce.");
    }
    const payload = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      const error = readableError(payload, `WooCommerce rejected the cart request (${response.status}).`);
      throw new CartApiError(error.message, response.status, error.code);
    }
    return payload;
  }

  async getCart(): Promise<CartSnapshot> { return mapCart(await this.request("GET", "cart")); }
  async addItem(payload: AddCartItemPayload): Promise<CartSnapshot> { return mapCart(await this.request("POST", "cart/add-item", payload)); }
  async updateItem(key: string, quantity: number): Promise<CartSnapshot> { return mapCart(await this.request("POST", "cart/update-item", { key, quantity })); }
  async removeItem(key: string): Promise<CartSnapshot> { return mapCart(await this.request("POST", "cart/remove-item", { key })); }
  async clearCart(): Promise<CartSnapshot> { await this.request("DELETE", "cart/items"); return this.getCart(); }
}
