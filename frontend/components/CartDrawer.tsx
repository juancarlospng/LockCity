"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { toast } from "sonner";
import { useCart } from "@/lib/cart";
import { cartErrorMessage } from "@/lib/cart-core";
import { formatPrice } from "@/lib/utils";
import { Media } from "./Media";

export function CartDrawer() {
  const {
    items, isOpen, closeCart, setQty, removeItem, clearCart,
    subtotal, total, currency, isLoading, isMutating, error,
  } = useCart();

  const update = async (operation: () => Promise<void>) => {
    try { await operation(); } catch (cause) { toast.error(cartErrorMessage(cause)); }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }} onClick={closeCart}
            className="fixed inset-0 z-[90] bg-bg/70 backdrop-blur-sm" aria-hidden />
          <motion.aside data-testid="cart-drawer" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-0 right-0 top-0 z-[96] flex w-full flex-col border-l border-graphite bg-onyx sm:w-[420px]"
            role="dialog" aria-modal="true" aria-label="Cart" aria-busy={isLoading || isMutating}>
            <div className="flex items-center justify-between border-b border-graphite px-6 py-5">
              <h2 className="font-display text-xl uppercase text-bone">Bag ({items.reduce((sum, item) => sum + item.qty, 0)})</h2>
              <button type="button" data-testid="cart-drawer-close-button" onClick={closeCart}
                className="text-[11px] uppercase tracking-[0.25em] text-steel transition-colors hover:text-bone">Close</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6">
              {isLoading && <p className="py-8 text-xs uppercase tracking-[0.2em] text-steel">Syncing bag…</p>}
              {!isLoading && error && items.length === 0 && (
                <div className="py-8" role="alert">
                  <p className="text-xs text-bone">{error}</p>
                  <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-steel">Your WooCommerce bag could not be loaded.</p>
                </div>
              )}
              {!isLoading && !error && items.length === 0 && (
                <div className="flex h-full flex-col items-start justify-center gap-4">
                  <p className="font-display text-3xl uppercase text-graphite">Your bag is empty</p>
                  <p className="text-xs uppercase tracking-[0.25em] text-steel">WooCommerce cart ready</p>
                </div>
              )}
              {error && items.length > 0 && <p className="mt-4 text-xs text-bone" role="alert">{error}</p>}
              <ul className="divide-y divide-graphite">
                {items.map((item) => (
                  <li key={item.key} data-testid={`cart-item-${item.key}`} data-cart-item-key={item.key}
                    data-product-id={item.productId} data-variation-id={item.variationId} className="flex gap-4 py-5">
                    <div className="w-20 shrink-0">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image} alt={item.name} className="aspect-[4/5] w-full border border-graphite object-cover" />
                      ) : <Media seed={item.id * 31} compact />}
                    </div>
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link href={`/product/${item.slug}`} onClick={closeCart}
                            className="text-sm font-bold uppercase text-bone hover:underline">{item.name}</Link>
                          <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-steel">
                            {item.type === "variation" ? `Variation #${item.variationId}` : `Product #${item.productId}`}
                            {item.sku ? ` · ${item.sku}` : ""}
                          </p>
                          {item.attributes.length > 0 && (
                            <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-steel">
                              {item.attributes.map((attribute) => `${attribute.name}: ${attribute.value}`).join(" · ")}
                            </p>
                          )}
                          <p className="mt-1 text-[10px] text-steel">{formatPrice(item.price, item.currency)} each</p>
                        </div>
                        <p className="text-xs text-bone">{formatPrice(item.total, item.currency)}</p>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center border border-graphite">
                          <button type="button" data-testid={`cart-qty-minus-${item.key}`}
                            disabled={isMutating || !item.quantityLimits.editable || item.qty <= item.quantityLimits.minimum}
                            onClick={() => update(() => setQty(item.key, item.qty - item.quantityLimits.multipleOf))}
                            className="px-3 py-1 text-xs text-steel transition-colors hover:text-bone disabled:cursor-not-allowed disabled:text-graphite"
                            aria-label="Decrease quantity">−</button>
                          <span className="px-2 text-xs text-bone">{item.qty}</span>
                          <button type="button" data-testid={`cart-qty-plus-${item.key}`}
                            disabled={isMutating || !item.quantityLimits.editable || item.qty >= item.quantityLimits.maximum}
                            onClick={() => update(() => setQty(item.key, item.qty + item.quantityLimits.multipleOf))}
                            className="px-3 py-1 text-xs text-steel transition-colors hover:text-bone disabled:cursor-not-allowed disabled:text-graphite"
                            aria-label="Increase quantity">+</button>
                        </div>
                        <button type="button" data-testid={`cart-remove-${item.key}`} disabled={isMutating}
                          onClick={() => update(() => removeItem(item.key))}
                          className="text-[10px] uppercase tracking-[0.2em] text-steel transition-colors hover:text-bone disabled:text-graphite">Remove</button>
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
                  <span data-testid="cart-subtotal" className="text-bone">{formatPrice(subtotal, currency)}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-[0.2em]">
                  <span className="text-steel">WooCommerce total</span>
                  <span data-testid="cart-total" className="text-bone">{formatPrice(total, currency)}</span>
                </div>
                <Link href="/checkout" onClick={closeCart} data-testid="cart-checkout-link"
                  className="mt-5 block w-full border border-bone py-4 text-center text-[10px] uppercase tracking-[0.25em] text-bone transition-colors hover:bg-bone hover:text-bg">
                  Checkout
                </Link>
                <button type="button" data-testid="cart-clear-button" disabled={isMutating}
                  onClick={() => update(clearCart)}
                  className="mt-3 w-full border border-graphite py-3 text-[10px] uppercase tracking-[0.25em] text-steel hover:border-bone hover:text-bone disabled:cursor-not-allowed disabled:text-graphite">Empty bag</button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
