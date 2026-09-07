"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { beginCheckout } from "@/lib/analytics";
import { formatPrice } from "@/lib/utils";
import { Media } from "./Media";

const storeUrl = process.env.NEXT_PUBLIC_WC_STORE_URL;

export function CartDrawer() {
  const { items, isOpen, closeCart, setQty, removeItem, subtotal, currency } =
    useCart();

  const onCheckout = () => {
    beginCheckout(
      items.map((i) => ({
        item_id: i.productId,
        item_name: i.name,
        item_variant: i.size,
        price: i.price,
        quantity: i.qty,
      })),
      subtotal
    );
  };

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
            aria-label="Cart"
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
                    Your bag is empty
                  </p>
                  <p className="text-xs uppercase tracking-[0.25em] text-steel">
                    The first drop is coming
                  </p>
                </div>
              )}
              <ul className="divide-y divide-graphite">
                {items.map((item) => (
                  <li
                    key={`${item.productId}-${item.variantId}`}
                    data-testid={`cart-item-${item.productId}`}
                    className="flex gap-4 py-5"
                  >
                    <div className="w-20 shrink-0">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image}
                          alt={item.name}
                          className="aspect-[4/5] w-full border border-graphite object-cover"
                        />
                      ) : (
                        <Media seed={item.productId.length * 31} compact />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link
                            href={`/product/${item.slug}`}
                            onClick={closeCart}
                            className="text-sm font-bold uppercase text-bone hover:underline"
                          >
                            {item.name}
                          </Link>
                          <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-steel">
                            {item.size ? `Size ${item.size}` : "One size"}
                            {item.color ? ` — ${item.color}` : ""}
                          </p>
                        </div>
                        <p className="text-xs text-bone">
                          {formatPrice(item.price * item.qty, item.currency)}
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
                ))}
              </ul>
            </div>

            {items.length > 0 && (
              <div className="border-t border-graphite px-6 py-6">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em]">
                  <span className="text-steel">Subtotal</span>
                  <span data-testid="cart-subtotal" className="text-bone">
                    {formatPrice(subtotal, currency)}
                  </span>
                </div>
                <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-steel">
                  Shipping calculated at checkout
                </p>
                {storeUrl ? (
                  <a
                    href={`${storeUrl}/checkout`}
                    data-testid="cart-checkout-button"
                    onClick={onCheckout}
                    className="mt-5 block w-full border border-bone bg-bone py-4 text-center text-xs font-bold uppercase tracking-[0.3em] text-bg transition-colors duration-300 hover:bg-transparent hover:text-bone"
                  >
                    Checkout
                  </a>
                ) : (
                  <div className="mt-5">
                    <button
                      type="button"
                      data-testid="cart-checkout-button"
                      disabled
                      className="w-full cursor-not-allowed border border-graphite py-4 text-xs font-bold uppercase tracking-[0.3em] text-graphite"
                    >
                      Checkout
                    </button>
                    <p className="mt-3 text-center text-[10px] uppercase tracking-[0.2em] text-steel">
                      Checkout opens with the first drop —{" "}
                      <Link
                        href="/#join"
                        onClick={closeCart}
                        className="text-bone underline underline-offset-4"
                      >
                        join the city
                      </Link>
                    </p>
                  </div>
                )}
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
