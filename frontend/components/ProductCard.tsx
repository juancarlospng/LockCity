"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { Media } from "./Media";
import { StatusBadge } from "./StatusBadge";

export function ProductCard({ product, index }: { product: Product; index: number }) {
  const { addItem } = useCart();
  const quickVariant =
    product.variants.find((v) => v.status === "AVAILABLE") ?? product.variants[0];
  const canAdd = product.status === "AVAILABLE" && quickVariant?.status === "AVAILABLE";

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
            {product.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.images[0]}
                alt={product.name}
                className="aspect-[4/5] w-full object-cover"
                loading="lazy"
              />
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
          </p>
        </div>
      </Link>
      <button
        type="button"
        data-testid={`quick-add-button-${product.id}`}
        disabled={!canAdd}
        onClick={() => canAdd && addItem(product, quickVariant)}
        className={`border-t border-graphite py-3 text-[10px] font-bold uppercase tracking-[0.3em] transition-colors duration-200 ${
          canAdd
            ? "text-bone hover:bg-bone hover:text-bg"
            : "cursor-not-allowed text-graphite"
        }`}
      >
        {canAdd ? `Quick add — ${quickVariant.size}` : "Unavailable"}
      </button>
    </article>
  );
}
