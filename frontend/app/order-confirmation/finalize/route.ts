import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  CHECKOUT_RESULT_COOKIE,
  checkoutFinalizationReceipt,
  verifyCheckoutResult,
  wooCartIsEmpty,
} from "@/lib/return-bridge-core";
import {
  WC_CART_COOKIE,
  WooServerError,
  sanitizedWooResponse,
  wooStoreRequest,
} from "@/lib/woocommerce-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FINALIZED_COOKIE = "lc_checkout_cart_finalized";

export async function POST() {
  try {
    const jar = await cookies();
    const signed = jar.get(CHECKOUT_RESULT_COOKIE)?.value ?? "";
    const secret = process.env.CHECKOUT_RETURN_SECRET ?? "";
    const result = signed && secret ? await verifyCheckoutResult(signed, secret) : null;
    if (!result || result.status !== "paid") {
      return Response.json({ error: "verified_paid_order_required" }, {
        status: 403,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const receipt = await checkoutFinalizationReceipt(signed);
    if (jar.get(FINALIZED_COOKIE)?.value === receipt) {
      return Response.json({ finalized: true, repeated: true }, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    const token = jar.get(WC_CART_COOKIE)?.value ?? "";
    if (token) {
      await wooStoreRequest("cart/items", token, { method: "DELETE" });
      const cart = await wooStoreRequest("cart", token, { method: "GET" });
      if (!wooCartIsEmpty(cart)) throw new WooServerError("WooCommerce did not confirm an empty cart.");
    }

    const response = NextResponse.json({ finalized: true }, {
      headers: { "Cache-Control": "no-store" },
    });
    response.cookies.set({
      name: FINALIZED_COOKIE,
      value: receipt,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/order-confirmation",
      maxAge: 10 * 60,
    });
    return response;
  } catch (error) {
    return sanitizedWooResponse(error);
  }
}
