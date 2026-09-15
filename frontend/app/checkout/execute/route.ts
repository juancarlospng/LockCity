import { cookies } from "next/headers";
import { buildPayPalCheckoutPayload, extractPayPalRedirect } from "@/lib/checkout-core";
import { isCheckoutExecutionEnabled, sanitizedWooResponse, WC_CART_COOKIE, wooStoreRequest } from "@/lib/woocommerce-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  if (!isCheckoutExecutionEnabled()) {
    return Response.json({
      error: "checkout_execution_disabled",
      message: "PayPal checkout execution is disabled for this deployment.",
    }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const token = (await cookies()).get(WC_CART_COOKIE)?.value ?? "";
    const cart = await wooStoreRequest("cart", token, { method: "GET" });
    const payload = buildPayPalCheckoutPayload(cart);
    const result = await wooStoreRequest("checkout", token, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return Response.json({ redirect_url: extractPayPalRedirect(result) }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return sanitizedWooResponse(error);
  }
}
