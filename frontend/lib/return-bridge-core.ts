export const CHECKOUT_RESULT_COOKIE = "lc_checkout_result";

export type CheckoutResultStatus = "paid" | "pending" | "failed";

export interface VerifiedCheckoutResult {
  verified: true;
  status: CheckoutResultStatus;
  orderNumber: string;
  issuedAt: number;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string): ArrayBuffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0)).buffer as ArrayBuffer;
}

function validStatus(value: unknown): value is CheckoutResultStatus {
  return value === "paid" || value === "pending" || value === "failed";
}

export function parseBridgeVerification(value: unknown, issuedAt = Date.now()): VerifiedCheckoutResult {
  if (!value || typeof value !== "object") throw new Error("Invalid checkout verification response.");
  const source = value as Record<string, unknown>;
  const orderNumber = typeof source.order_number === "string" ? source.order_number : "";
  if (source.verified !== true || !validStatus(source.status) || !/^[A-Za-z0-9_-]{1,64}$/.test(orderNumber)) {
    throw new Error("Invalid checkout verification response.");
  }
  return { verified: true, status: source.status, orderNumber, issuedAt };
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  if (secret.length < 32) throw new Error("Checkout return verification is not configured.");
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signCheckoutResult(result: VerifiedCheckoutResult, secret: string): Promise<string> {
  const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(result)));
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), new TextEncoder().encode(payload));
  return `${payload}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export async function verifyCheckoutResult(
  signed: string,
  secret: string,
  now = Date.now(),
): Promise<VerifiedCheckoutResult | null> {
  const [payload, signature, extra] = signed.split(".");
  if (!payload || !signature || extra) return null;
  let valid = false;
  try {
    valid = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(secret),
      base64UrlDecode(signature),
      new TextEncoder().encode(payload),
    );
  } catch { return null; }
  if (!valid) return null;
  try {
    const source = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload))) as Record<string, unknown>;
    const result = parseBridgeVerification({
      verified: source.verified,
      status: source.status,
      order_number: source.orderNumber,
    }, Number(source.issuedAt));
    if (!Number.isFinite(result.issuedAt) || result.issuedAt > now + 30_000 || now - result.issuedAt > 10 * 60_000) return null;
    return result;
  } catch { return null; }
}

export function cancelCheckoutUrl(origin: string): string {
  const url = new URL("/checkout", origin);
  url.searchParams.set("payment", "cancelled");
  return url.toString();
}
