import { Suspense } from "react";
import { CheckoutForm } from "@/components/CheckoutForm";

export const dynamic = "force-dynamic";

export default function CheckoutPage() {
  const executionEnabled = process.env.PAYPAL_CHECKOUT_EXECUTION_ENABLED === "true";

  return (
    <div data-testid="checkout-page" className="px-4 pb-24 pt-32 sm:px-8 lg:px-12 lg:pt-40">
      <p className="text-[10px] uppercase tracking-[0.3em] text-steel">Secure checkout</p>
      <h1 className="mt-4 font-display text-6xl uppercase leading-[0.85] text-bone sm:text-8xl lg:text-9xl">Checkout</h1>
      <p className="mt-6 max-w-2xl text-sm leading-7 text-steel">
        Address, delivery options, taxes and totals come directly from WooCommerce. {executionEnabled
          ? "PayPal checkout is enabled for this environment."
          : "PayPal payment execution is disabled."}
      </p>
      <Suspense fallback={<p className="mt-16 text-xs uppercase tracking-[0.2em] text-steel">Loading checkout…</p>}>
        <CheckoutForm />
      </Suspense>
    </div>
  );
}
