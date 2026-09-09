"use client";
import type { CartItem } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import Link from "./StoreLink";
import { ProductImage } from "./ProductImage";
export function CartContents({
  items,
  setQty,
  removeItem,
  onNavigate,
}: {
  items: CartItem[];
  setQty: (p: string, v: string, q: number) => void;
  removeItem: (p: string, v: string) => void;
  onNavigate?: () => void;
}) {
  const currencies = new Set(items.map((i) => i.currency));
  return (
    <div className="space-y-8">
      {!items.length ? (
        <div className="py-14">
          <h2 className="font-display text-3xl uppercase">Your bag is empty</h2>
          <p className="mt-4 text-steel">
            Explore the clothing and culture of Lock City.
          </p>
          <Link href="/shop" onClick={onNavigate} className="lc-button mt-8">
            Shop Lock City →
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-graphite">
          {items.map((item) => (
            <li
              key={item.productId + item.variantId}
              className="flex gap-4 py-6"
            >
              <div className="w-20 shrink-0">
                <ProductImage src={item.image} alt={item.name} />
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/product/${item.slug}`}
                  onClick={onNavigate}
                  className="font-display text-xl uppercase"
                >
                  {item.name}
                </Link>
                <p className="my-2 text-sm text-steel">
                  {[item.color, item.size].filter(Boolean).join(" / ")}
                </p>
                <p>{formatPrice(item.price * item.qty, item.currency)}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label className="text-sm">
                    Quantity{" "}
                    <input
                      type="number"
                      min={1}
                      value={item.qty}
                      onChange={(e) =>
                        setQty(
                          item.productId,
                          item.variantId,
                          Number(e.target.value),
                        )
                      }
                      className="lc-input !w-20"
                    />
                  </label>
                  <button
                    type="button"
                    className="text-sm underline"
                    onClick={() => removeItem(item.productId, item.variantId)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="border-t border-graphite pt-6">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>
            {items.length && currencies.size === 1
              ? formatPrice(
                  items.reduce((sum, i) => sum + i.price * i.qty, 0),
                  items[0].currency,
                )
              : "—"}
          </span>
        </div>
        <button type="button" className="lc-button mt-6 w-full" disabled>
          Checkout
        </button>
        <p className="mt-3 text-sm text-steel">
          Checkout is not available here yet.
        </p>
      </div>
    </div>
  );
}
