import { cookies } from "next/headers";
import { buildPayPalCheckoutPayload, mapCheckoutCart } from "@/lib/checkout-core";
import { isCheckoutExecutionEnabled, sanitizedWooResponse, WC_CART_COOKIE, wooStoreRequest } from "@/lib/woocommerce-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const token = (await cookies()).get(WC_CART_COOKIE)?.value ?? "";
    const cart = await wooStoreRequest("cart", token, { method: "GET" });
    const payload = buildPayPalCheckoutPayload(cart);
    const snapshot = mapCheckoutCart(cart);
    return Response.json({
      ready: true,
      gateway: payload.payment_method,
      currency: "USD",
      expected_total: payload.expected_total,
      selected_shipping_rates: snapshot.selectedShippingRates.map((rate) => rate.rateId),
      execution_enabled: isCheckoutExecutionEnabled(),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return sanitizedWooResponse(error);
  }
}
