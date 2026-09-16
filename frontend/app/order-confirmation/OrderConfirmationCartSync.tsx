"use client";

import { useEffect, useRef } from "react";
import { useCart } from "@/lib/cart";

/** Synchronizes the UI only after the server has accepted a paid return. */
export function OrderConfirmationCartSync() {
  const { refreshCart } = useCart();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void fetch("/order-confirmation/finalize", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    }).then((response) => {
      if (!response.ok) throw new Error("Cart finalization was rejected.");
      return refreshCart();
    }).catch(() => undefined);
  }, [refreshCart]);

  return null;
}
