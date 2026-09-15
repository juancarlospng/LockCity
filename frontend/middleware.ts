import { NextRequest, NextResponse } from "next/server";
import {
  CHECKOUT_RESULT_COOKIE,
  parseBridgeVerification,
  signCheckoutResult,
} from "@/lib/return-bridge-core";

export const config = { matcher: "/order-confirmation" };

function confirmationRedirect(request: NextRequest) {
  return new URL("/order-confirmation", request.url);
}

export async function middleware(request: NextRequest) {
  if (request.method !== "POST") return NextResponse.next();

  const bridgeSecret = process.env.CHECKOUT_BRIDGE_SECRET ?? "";
  const returnSecret = process.env.CHECKOUT_RETURN_SECRET ?? "";
  const storeUrl = process.env.WC_STORE_URL ?? "";
  if (bridgeSecret.length < 32 || returnSecret.length < 32 || !storeUrl) {
    return NextResponse.redirect(confirmationRedirect(request), 303);
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 2048) return NextResponse.redirect(confirmationRedirect(request), 303);

  try {
    const form = await request.formData();
    const code = String(form.get("bridge_code") ?? "");
    if (!/^[A-Za-z0-9_-]{43}$/.test(code)) throw new Error("Invalid bridge code.");

    const endpoint = new URL("/wp-json/lock-city/v1/checkout-result", storeUrl);
    const verification = await fetch(endpoint, {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${bridgeSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
      signal: AbortSignal.timeout(10000),
    });
    if (!verification.ok) throw new Error("Checkout verification failed.");
    const result = parseBridgeVerification(await verification.json());
    const signed = await signCheckoutResult(result, returnSecret);
    const response = NextResponse.redirect(confirmationRedirect(request), 303);
    response.cookies.set({
      name: CHECKOUT_RESULT_COOKIE,
      value: signed,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/order-confirmation",
      maxAge: 10 * 60,
    });
    return response;
  } catch {
    return NextResponse.redirect(confirmationRedirect(request), 303);
  }
}
