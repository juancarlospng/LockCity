import Link from "next/link";
import { cookies } from "next/headers";
import { CHECKOUT_RESULT_COOKIE, verifyCheckoutResult } from "@/lib/return-bridge-core";

export const dynamic = "force-dynamic";

export default async function OrderConfirmationPage() {
  const signed = (await cookies()).get(CHECKOUT_RESULT_COOKIE)?.value ?? "";
  const secret = process.env.CHECKOUT_RETURN_SECRET ?? "";
  const result = signed && secret ? await verifyCheckoutResult(signed, secret) : null;
  const paid = result?.verified === true && result.status === "paid";
  const pending = result?.verified === true && result.status === "pending";

  return (
    <div data-testid="order-confirmation-page" className="min-h-[75vh] px-4 pb-24 pt-36 sm:px-8 lg:px-12 lg:pt-44">
      <p className="text-[10px] uppercase tracking-[0.3em] text-steel">Order status</p>
      <h1 className="mt-4 max-w-5xl font-display text-5xl uppercase leading-[0.9] text-bone sm:text-7xl lg:text-8xl">
        {paid ? "Order confirmed" : pending ? "Payment processing" : "Verification required"}
      </h1>
      <div className="mt-10 max-w-2xl border border-graphite bg-onyx p-6 sm:p-8">
        {paid ? (
          <>
            <p data-testid="verified-paid-status" className="text-sm leading-7 text-bone">
              WooCommerce verified the payment and order status on the server.
            </p>
            <p className="mt-4 text-xs uppercase tracking-[0.2em] text-steel">Order {result.orderNumber}</p>
          </>
        ) : pending ? (
          <>
            <p data-testid="verified-pending-status" className="text-sm leading-7 text-bone">
              WooCommerce verified the order, but payment is not confirmed yet. Refresh after the gateway finishes processing.
            </p>
            <p className="mt-4 text-xs uppercase tracking-[0.2em] text-steel">Order {result.orderNumber}</p>
          </>
        ) : (
          <p data-testid="unverified-order-status" className="text-sm leading-7 text-bone">
            This page has no valid server verification. No payment success is being claimed.
          </p>
        )}
        <Link href={paid ? "/shop" : "/checkout"}
          className="mt-8 inline-block border border-bone px-6 py-3 text-[10px] uppercase tracking-[0.24em] text-bone transition-colors hover:bg-bone hover:text-bg">
          {paid ? "Continue shopping" : "Return to checkout"}
        </Link>
      </div>
    </div>
  );
}
