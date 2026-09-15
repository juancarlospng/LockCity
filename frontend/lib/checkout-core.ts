import { CartApiError, mapCart, type CartSnapshot } from "./cart-core";
import { fallbackCountries } from "./countries";

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type JsonRecord = Record<string, unknown>;

export interface CheckoutAddress {
  first_name: string;
  last_name: string;
  company?: string;
  address_1: string;
  address_2?: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  email?: string;
  phone?: string;
}

export interface CheckoutCustomerPayload {
  billing_address: CheckoutAddress;
  shipping_address: CheckoutAddress;
}

export interface ShippingRate {
  packageId: number;
  rateId: string;
  methodId: string;
  instanceId?: number;
  name: string;
  description?: string;
  deliveryTime?: string;
  price: number;
  taxes: number;
  currency: string;
  selected: boolean;
}

export interface ShippingPackage {
  packageId: number;
  rates: ShippingRate[];
}

export interface CheckoutSnapshot extends CartSnapshot {
  billingAddress: CheckoutAddress;
  shippingAddress: CheckoutAddress;
  needsShipping: boolean;
  hasCalculatedShipping: boolean;
  shippingPackages: ShippingPackage[];
  selectedShippingRates: ShippingRate[];
  itemTax: number;
  shipping: number;
  shippingTax: number;
  totalTax: number;
  expectedTotal: string;
}

export interface WooCountry {
  code: string;
  name: string;
  states: { code: string; name: string }[];
}

export interface PayPalCheckoutPayload extends CheckoutCustomerPayload {
  payment_method: "ppcp-gateway";
  payment_data: { key: string; value: string }[];
  expected_total: string;
}

export interface CheckoutPreparation {
  ready: boolean;
  gateway: "ppcp-gateway";
  currency: "USD";
  expectedTotal: string;
  selectedShippingRates: string[];
  executionEnabled: boolean;
}

const addressKeys = [
  "first_name", "last_name", "company", "address_1", "address_2",
  "city", "state", "postcode", "country", "email", "phone",
] as const;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function amount(value: unknown, minorUnit: unknown): number {
  const raw = typeof value === "string" || typeof value === "number" ? Number(value) : 0;
  const decimals = Number.isInteger(Number(minorUnit)) ? Number(minorUnit) : 2;
  return Number.isFinite(raw) ? raw / 10 ** decimals : 0;
}

function sumMinorAmounts(value: unknown): number {
  if (typeof value === "string" || typeof value === "number") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (Array.isArray(value)) return value.reduce((sum, entry) => sum + sumMinorAmounts(entry), 0);
  if (value && typeof value === "object") {
    return Object.values(value as JsonRecord).reduce<number>((sum, entry) => sum + sumMinorAmounts(entry), 0);
  }
  return 0;
}

function mapAddress(value: unknown): CheckoutAddress {
  const source = record(value);
  const output = {} as Record<(typeof addressKeys)[number], string>;
  for (const key of addressKeys) output[key] = text(source[key]);
  return output;
}

function cleanField(value: unknown, label: string, max = 200): string {
  if (typeof value !== "string") throw new CartApiError(`${label} is invalid.`);
  const cleaned = value.trim();
  if (cleaned.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(cleaned)) {
    throw new CartApiError(`${label} is invalid.`);
  }
  return cleaned;
}

function validateAddress(address: CheckoutAddress, billing: boolean): CheckoutAddress {
  const normalized: CheckoutAddress = {
    first_name: cleanField(address.first_name, "First name", 80),
    last_name: cleanField(address.last_name, "Last name", 80),
    company: cleanField(address.company ?? "", "Company", 120),
    address_1: cleanField(address.address_1, "Address", 200),
    address_2: cleanField(address.address_2 ?? "", "Address line 2", 200),
    city: cleanField(address.city, "City", 100),
    state: cleanField(address.state, "Region", 100).toUpperCase(),
    postcode: cleanField(address.postcode, "Postal code", 30),
    country: cleanField(address.country, "Country", 2).toUpperCase(),
  };
  for (const [key, label] of [
    ["first_name", "First name"], ["last_name", "Last name"],
    ["address_1", "Address"], ["city", "City"], ["postcode", "Postal code"], ["country", "Country"],
  ] as const) {
    if (!normalized[key]) throw new CartApiError(`${label} is required.`);
  }
  if (!/^[A-Z]{2}$/.test(normalized.country)) throw new CartApiError("Country is invalid.");
  const phone = cleanField(address.phone ?? "", "Phone", 40);
  if (phone) normalized.phone = phone;
  if (billing) {
    const email = cleanField(address.email ?? "", "Email", 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new CartApiError("A valid email is required.");
    normalized.email = email;
  }
  return normalized;
}

export function buildCustomerPayload(
  billingAddress: CheckoutAddress,
  shippingAddress: CheckoutAddress,
): CheckoutCustomerPayload {
  const billing = validateAddress(billingAddress, true);
  const shipping = validateAddress(shippingAddress, false);
  if (!shipping.phone && billing.phone) shipping.phone = billing.phone;
  return {
    billing_address: billing,
    shipping_address: shipping,
  };
}

export function mapCheckoutCart(raw: unknown): CheckoutSnapshot {
  const base = mapCart(raw);
  const cart = record(raw);
  const totals = record(cart.totals);
  const minorUnit = totals.currency_minor_unit;
  const currency = text(totals.currency_code) || base.currency;
  const packages = Array.isArray(cart.shipping_rates) ? cart.shipping_rates : [];
  const shippingPackages = packages.flatMap((entry, index): ShippingPackage[] => {
    const pkg = record(entry);
    const packageId = Number(pkg.package_id ?? index);
    const rates = Array.isArray(pkg.shipping_rates) ? pkg.shipping_rates : [];
    return [{
      packageId,
      rates: rates.flatMap((candidate): ShippingRate[] => {
        const rate = record(candidate);
        const rateId = text(rate.rate_id);
        const methodId = text(rate.method_id);
        if (!rateId || !methodId) return [];
        const rateMinorUnit = rate.currency_minor_unit ?? minorUnit;
        const instanceId = Number(rate.instance_id);
        return [{
          packageId,
          rateId,
          methodId,
          instanceId: Number.isInteger(instanceId) ? instanceId : undefined,
          name: text(rate.name) || methodId,
          description: text(rate.description) || undefined,
          deliveryTime: text(rate.delivery_time) || undefined,
          price: amount(rate.price, rateMinorUnit),
          taxes: amount(sumMinorAmounts(rate.taxes), rateMinorUnit),
          currency: text(rate.currency_code) || currency,
          selected: rate.selected === true,
        }];
      }),
    }];
  });
  const expectedTotal = text(totals.total_price);
  if (!/^\d+$/.test(expectedTotal)) throw new CartApiError("WooCommerce returned an invalid checkout total.");
  return {
    ...base,
    billingAddress: mapAddress(cart.billing_address),
    shippingAddress: mapAddress(cart.shipping_address),
    needsShipping: cart.needs_shipping === true,
    hasCalculatedShipping: cart.has_calculated_shipping === true,
    shippingPackages,
    selectedShippingRates: shippingPackages.flatMap((pkg) => pkg.rates.filter((rate) => rate.selected)),
    itemTax: amount(totals.total_items_tax, minorUnit),
    shipping: amount(totals.total_shipping, minorUnit),
    shippingTax: amount(totals.total_shipping_tax, minorUnit),
    totalTax: amount(totals.total_tax, minorUnit),
    expectedTotal,
  };
}

export function buildPayPalCheckoutPayload(rawCart: unknown): PayPalCheckoutPayload {
  const cart = record(rawCart);
  const snapshot = mapCheckoutCart(rawCart);
  if (snapshot.items.length === 0) throw new CartApiError("The WooCommerce cart is empty.");
  if (snapshot.currency !== "USD") throw new CartApiError("This checkout only accepts WooCommerce totals in USD.");
  if (snapshot.needsShipping) {
    if (!snapshot.hasCalculatedShipping) throw new CartApiError("Calculate shipping before continuing.");
    if (snapshot.selectedShippingRates.length !== snapshot.shippingPackages.length) {
      throw new CartApiError("Select a WooCommerce shipping rate for every package.");
    }
  }
  const addresses = buildCustomerPayload(mapAddress(cart.billing_address), mapAddress(cart.shipping_address));
  return {
    ...addresses,
    payment_method: "ppcp-gateway",
    payment_data: [],
    expected_total: snapshot.expectedTotal,
  };
}

function readableError(payload: unknown, fallback: string): { message: string; code?: string } {
  const body = record(payload);
  const raw = typeof body.message === "string" ? body.message : fallback;
  const message = raw.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  return { message: message || fallback, code: typeof body.code === "string" ? body.code : undefined };
}

export function extractPayPalRedirect(payload: unknown): string {
  const paymentResult = record(record(payload).payment_result);
  const candidate = text(paymentResult.redirect_url);
  let redirect: URL;
  try { redirect = new URL(candidate); }
  catch { throw new CartApiError("WooCommerce did not return a valid PayPal redirect."); }
  const host = redirect.hostname.toLowerCase();
  const allowed = host === "paypal.com" || host.endsWith(".paypal.com") || host === "lockcityclothes.com";
  if (redirect.protocol !== "https:" || !allowed || redirect.username || redirect.password) {
    throw new CartApiError("WooCommerce returned an unsafe PayPal redirect.");
  }
  return redirect.toString();
}

export function parsePreparation(payload: unknown): CheckoutPreparation {
  const source = record(payload);
  if (source.ready !== true || source.gateway !== "ppcp-gateway" || source.currency !== "USD") {
    throw new CartApiError("Checkout preparation returned an invalid response.");
  }
  const expectedTotal = text(source.expected_total);
  if (!/^\d+$/.test(expectedTotal)) throw new CartApiError("Checkout preparation returned an invalid total.");
  const selected = Array.isArray(source.selected_shipping_rates)
    ? source.selected_shipping_rates.filter((entry): entry is string => typeof entry === "string")
    : [];
  return {
    ready: true,
    gateway: "ppcp-gateway",
    currency: "USD",
    expectedTotal,
    selectedShippingRates: selected,
    executionEnabled: source.execution_enabled === true,
  };
}

export class WooCheckoutClient {
  constructor(private readonly fetcher: Fetcher = (input, init) => fetch(input, init)) {}

  private async request(method: string, path: string, body?: unknown): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetcher(path, {
        method,
        credentials: "include",
        cache: "no-store",
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new CartApiError("Could not reach WooCommerce.");
    }
    const payload = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      const error = readableError(payload, `WooCommerce rejected the checkout request (${response.status}).`);
      throw new CartApiError(error.message, response.status, error.code);
    }
    return payload;
  }

  async getCart(): Promise<CheckoutSnapshot> {
    return mapCheckoutCart(await this.request("GET", "/store/cart"));
  }

  async getCountries(): Promise<WooCountry[]> {
    let raw: unknown;
    try { raw = await this.request("GET", "/store/data/countries"); }
    catch (error) {
      if (error instanceof CartApiError && error.status === 404) return fallbackCountries();
      throw error;
    }
    if (!Array.isArray(raw)) throw new CartApiError("WooCommerce returned invalid country data.");
    return raw.flatMap((entry): WooCountry[] => {
      const country = record(entry);
      const code = text(country.code).toUpperCase();
      const name = text(country.name);
      if (!/^[A-Z]{2}$/.test(code) || !name) return [];
      const states = Array.isArray(country.states) ? country.states.flatMap((item): { code: string; name: string }[] => {
        const state = record(item);
        const stateCode = text(state.code);
        const stateName = text(state.name);
        return stateCode && stateName ? [{ code: stateCode, name: stateName }] : [];
      }) : [];
      return [{ code, name, states }];
    });
  }

  async updateCustomer(payload: CheckoutCustomerPayload): Promise<CheckoutSnapshot> {
    return mapCheckoutCart(await this.request("POST", "/store/cart/update-customer", payload));
  }

  async selectShippingRate(packageId: number, rateId: string): Promise<CheckoutSnapshot> {
    if (!Number.isInteger(packageId) || packageId < 0 || !rateId) throw new CartApiError("The shipping rate is invalid.");
    return mapCheckoutCart(await this.request("POST", "/store/cart/select-shipping-rate", {
      package_id: packageId,
      rate_id: rateId,
    }));
  }

  async preparePayPal(): Promise<CheckoutPreparation> {
    return parsePreparation(await this.request("POST", "/checkout/prepare", {}));
  }

  async executePayPal(): Promise<string> {
    return extractPayPalRedirect(await this.request("POST", "/checkout/execute", {}));
  }
}
