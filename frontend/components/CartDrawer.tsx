"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/utils";
import { Media } from "./Media";

export function CartDrawer() {
  const { items, isOpen, closeCart, setQty, removeItem, subtotal, resolve } =
    useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={closeCart}
            className="fixed inset-0 z-[90] bg-bg/70 backdrop-blur-sm"
            aria-hidden
          />
          <motion.aside
            data-testid="cart-drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-0 right-0 top-0 z-[96] flex w-full flex-col border-l border-graphite bg-onyx sm:w-[420px]"
            role="dialog"
            aria-modal="true"
            aria-label="Bag"
          >
            <div className="flex items-center justify-between border-b border-graphite px-6 py-5">
              <h2 className="font-display text-xl uppercase text-bone">
                Bag ({items.reduce((a, i) => a + i.qty, 0)})
              </h2>
              <button
                type="button"
                data-testid="cart-drawer-close-button"
                onClick={closeCart}
                className="text-[11px] uppercase tracking-[0.25em] text-steel transition-colors hover:text-bone"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6">
              {items.length === 0 && (
                <div className="flex h-full flex-col items-start justify-center gap-4">
                  <p className="font-display text-3xl uppercase text-graphite">
                    The bag is empty
                  </p>
                  <p className="text-xs uppercase tracking-[0.25em] text-steel">
                    Objects await — Mock data
                  </p>
                </div>
              )}
              <ul className="divide-y divide-graphite">
                {items.map((item) => {
                  const resolved = resolve(item);
                  if (!resolved) return null;
                  const { product, variant } = resolved;
                  return (
                    <li
                      key={`${item.productId}-${item.variantId}`}
                      data-testid={`cart-item-${item.productId}`}
                      className="flex gap-4 py-5"
                    >
                      <div className="w-20 shrink-0">
                        <Media seed={product.seed} code={product.code} compact />
                      </div>
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[9px] tracking-[0.3em] text-steel">
                              {product.code}
                            </p>
                            <p className="mt-0.5 text-sm font-bold uppercase text-bone">
                              {product.name}
                            </p>
                            <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-steel">
                              Size {variant.size} — {product.color}
                            </p>
                          </div>
                          <p className="text-xs text-bone">
                            {formatPrice(product.price * item.qty)}
                          </p>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center border border-graphite">
                            <button
                              type="button"
                              data-testid={`cart-qty-minus-${item.productId}`}
                              onClick={() =>
                                setQty(item.productId, item.variantId, item.qty - 1)
                              }
                              className="px-3 py-1 text-xs text-steel transition-colors hover:text-bone"
                              aria-label="Decrease quantity"
                            >
                              −
                            </button>
                            <span className="px-2 text-xs text-bone">{item.qty}</span>
                            <button
                              type="button"
                              data-testid={`cart-qty-plus-${item.productId}`}
                              onClick={() =>
                                setQty(item.productId, item.variantId, item.qty + 1)
                              }
                              className="px-3 py-1 text-xs text-steel transition-colors hover:text-bone"
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            data-testid={`cart-remove-${item.productId}`}
                            onClick={() => removeItem(item.productId, item.variantId)}
                            className="text-[10px] uppercase tracking-[0.2em] text-steel transition-colors hover:text-bone"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {items.length > 0 && (
              <div className="border-t border-graphite px-6 py-6">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em]">
                  <span className="text-steel">Subtotal — Mock</span>
                  <span data-testid="cart-subtotal" className="text-bone">
                    {formatPrice(subtotal)}
                  </span>
                </div>
                <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-steel">
                  Shipping [Information pending]
                </p>
                <button
                  type="button"
                  data-testid="cart-checkout-demo-button"
                  onClick={() => setCheckoutOpen(true)}
                  className="mt-5 w-full border border-bone bg-bone py-4 text-xs font-bold uppercase tracking-[0.3em] text-bg transition-colors duration-300 hover:bg-transparent hover:text-bone"
                >
                  Checkout — Demo
                </button>
              </div>
            )}

            <AnimatePresence>
              {checkoutOpen && (
                <motion.div
                  data-testid="demo-checkout-modal"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 bg-onyx/98 px-8 text-center"
                  role="alertdialog"
                  aria-label="Demo checkout"
                >
                  <p className="text-[10px] uppercase tracking-[0.3em] text-steel">
                    Prototype only
                  </p>
                  <p className="font-display text-4xl uppercase leading-none text-bone">
                    Demo
                    <br />
                    Checkout
                  </p>
                  <p className="max-w-[260px] text-xs leading-relaxed text-steel">
                    No payment is processed. Checkout will be handled by the future
                    Lock City Admin API. [Information pending]
                  </p>
                  <button
                    type="button"
                    data-testid="demo-checkout-close-button"
                    onClick={() => setCheckoutOpen(false)}
                    className="border border-graphite px-8 py-3 text-xs uppercase tracking-[0.3em] text-bone transition-colors hover:border-bone"
                  >
                    Back to bag
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
