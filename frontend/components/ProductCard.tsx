"use client";

import Link from "next/link";
import { toast } from "sonner";
import { useCart } from "@/lib/cart";
import { cartErrorMessage } from "@/lib/cart-core";
import { getProductCardAction } from "@/lib/product-card-state";
import { mainProductImage } from "@/lib/product-media";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { Media } from "./Media";
import { StatusBadge } from "./StatusBadge";

export function ProductCard({ product, index }: { product: Product; index: number }) {
  const { addItem, isMutating } = useCart();
  const mainImage = mainProductImage(product);
  const action = getProductCardAction(product);
  const canQuickAdd = action.kind === "quick-add" && !isMutating;

  return (
    <article
      data-testid={`product-card-${product.id}`}
      className="group relative flex flex-col border border-graphite bg-card transition-colors duration-300 hover:border-bone"
    >
      <Link
        href={`/product/${product.slug}`}
        data-testid={`product-link-${product.id}`}
        data-cursor="view"
        className="block"
        aria-label={`View ${product.name}`}
      >
        <div className="relative overflow-hidden">
          <div className="transition-transform duration-700 ease-out group-hover:scale-[1.04]">
            {mainImage ? (
              <div className="aspect-[4/5] w-full bg-[#f2f1ed] p-4 sm:p-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mainImage}
                  alt={product.name}
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              </div>
            ) : (
              <Media seed={product.id.length * 17 + 7} code={product.code} />
            )}
          </div>
          <div className="absolute left-3 top-3 flex items-center gap-3">
            <span className="text-[9px] tracking-[0.3em] text-steel">
              {String(index + 1).padStart(2, "0")}
            </span>
            <StatusBadge status={product.status} />
          </div>
        </div>
        <div className="flex items-start justify-between gap-3 border-t border-graphite p-5">
          <div>
            {product.code && (
              <p className="text-[9px] tracking-[0.3em] text-steel">{product.code}</p>
            )}
            <h3 className="mt-1 font-display text-xl uppercase leading-none text-bone">
              {product.name}
            </h3>
            {product.color && (
              <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-steel">
                {product.color}
              </p>
            )}
          </div>
          <p className="shrink-0 text-xs text-bone">
            {formatPrice(product.price, product.currency)}
            {product.priceRange && product.priceRange.max !== product.price && ` – ${formatPrice(product.priceRange.max, product.currency)}`}
          </p>
        </div>
      </Link>
      {action.kind === "select-options" ? (
        <Link
          href={`/product/${product.slug}`}
          data-testid={`select-options-link-${product.id}`}
          className="border-t border-graphite py-3 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-bone transition-colors duration-200 hover:bg-bone hover:text-bg"
        >
          {action.label}
        </Link>
      ) : (
        <button
          type="button"
          data-testid={`quick-add-button-${product.id}`}
          disabled={!canQuickAdd}
          onClick={async () => {
            if (!canQuickAdd || action.kind !== "quick-add") return;
            try { await addItem(product, action.variant); }
            catch (cause) { toast.error(cartErrorMessage(cause)); }
          }}
          className={`border-t border-graphite py-3 text-[10px] font-bold uppercase tracking-[0.3em] transition-colors duration-200 ${
            canQuickAdd
              ? "text-bone hover:bg-bone hover:text-bg"
              : "cursor-not-allowed text-graphite"
          }`}
        >
          {action.label}
        </button>
      )}
    </article>
  );
}