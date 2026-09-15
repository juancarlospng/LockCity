import "server-only";
import { CartApiError } from "./cart-core";

export const WC_CART_COOKIE = "lc_wc_cart_token";

export class WooServerError extends Error {
  constructor(message: string, public readonly status = 502, public readonly code = "woocommerce") {
    super(message);
    this.name = "WooServerError";
  }
}

function storeBaseUrl(): URL {
  const configured = process.env.WC_STORE_URL;
  if (!configured) throw new WooServerError("The store connection is not configured.", 503, "configuration");
  let url: URL;
  try { url = new URL(configured); }
  catch { throw new WooServerError("The store connection is invalid.", 503, "configuration"); }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new WooServerError("The store connection is invalid.", 503, "configuration");
  }
  return url;
}

export function isCheckoutExecutionEnabled(): boolean {
  if (process.env.PAYPAL_CHECKOUT_EXECUTION_ENABLED !== "true") return false;
  try {
    const store = new URL(process.env.WC_STORE_URL ?? "");
    return store.protocol === "https:" && !store.username && !store.password;
  } catch {
    return false;
  }
}

function sanitizeWooError(payload: unknown, status: number): WooServerError {
  if (!payload || typeof payload !== "object") return new WooServerError(`WooCommerce rejected the request (${status}).`, status);
  const source = payload as Record<string, unknown>;
  const raw = typeof source.message === "string" ? source.message : `WooCommerce rejected the request (${status}).`;
  const message = raw.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  return new WooServerError(message, status, typeof source.code === "string" ? source.code : "woocommerce");
}

export async function wooStoreRequest(path: string, cartToken: string, init: RequestInit = {}): Promise<unknown> {
  if (!cartToken) throw new WooServerError("The WooCommerce cart session is missing.", 400, "cart_session_missing");
  const upstream = new URL(`/wp-json/wc/store/v1/${path.replace(/^\/+/, "")}`, storeBaseUrl());
  if (path === "cart" && (!init.method || init.method === "GET")) upstream.searchParams.set("_lc_cart", crypto.randomUUID());
  const headers = new Headers(init.headers);
  headers.set("Cart-Token", cartToken);
  if (init.body !== undefined) headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(upstream, {
      ...init,
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new WooServerError("Could not reach WooCommerce.");
  }
  const payload: unknown = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw sanitizeWooError(payload, response.status);
  return payload;
}

export function sanitizedWooResponse(error: unknown): Response {
  if (error instanceof WooServerError) {
    return Response.json({ error: error.code, message: error.message }, { status: error.status });
  }
  if (error instanceof CartApiError) {
    return Response.json({ error: error.code ?? "checkout_validation", message: error.message }, { status: error.status ?? 400 });
  }
  return Response.json({ error: "network", message: "Could not reach WooCommerce." }, { status: 502 });
}
