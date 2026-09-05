"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Media } from "@/components/Media";
import { ProductCard } from "@/components/ProductCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useCart } from "@/lib/cart";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

const GALLERY_OFFSETS = [0, 1000, 2000];

export function ProductDetail({
  product,
  related,
}: {
  product: Product;
  related: Product[];
}) {
  const { addItem } = useCart();
  const [frame, setFrame] = useState(0);
  const [variantId, setVariantId] = useState(
    product.variants.find((v) => v.status === "AVAILABLE")?.id ??
      product.variants[0]?.id
  );

  const purchasable =
    product.status === "AVAILABLE" || product.status === "PRE_ORDER";

  const ctaLabel = !purchasable
    ? product.status === "COMING_SOON"
      ? "Coming soon"
      : "Sold out"
    : product.status === "PRE_ORDER"
      ? "Pre-order — Demo"
      : "Add to bag";

  const onAdd = () => {
    if (!purchasable || !variantId) return;
    addItem(product.id, variantId);
    toast.success(`${product.code} added to bag — mock`);
  };

  return (
    <div data-testid="product-page" className="px-4 pb-24 pt-32 sm:px-8 lg:px-12 lg:pt-40">
      <p className="text-[10px] uppercase tracking-[0.3em] text-steel">
        {product.collection.toUpperCase()} / {product.category} — Mock data
      </p>

      <div className="mt-8 grid grid-cols-1 gap-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div data-testid="product-gallery" className="border border-graphite">
            <Media
              seed={product.seed + GALLERY_OFFSETS[frame]}
              code={product.code}
              className="min-h-[380px] lg:min-h-[620px]"
            />
          </div>
          <div className="mt-4 flex gap-3">
            {GALLERY_OFFSETS.map((offset, i) => (
              <button
                key={offset}
                type="button"
                data-testid={`gallery-frame-${i}`}
                onClick={() => setFrame(i)}
                aria-label={`View frame ${i + 1}`}
                aria-pressed={frame === i}
                className={`w-20 border transition-colors duration-200 ${
                  frame === i ? "border-bone" : "border-graphite hover:border-steel"
                }`}
              >
                <Media seed={product.seed + offset} compact />
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <div className="flex items-center justify-between">
              <p className="text-[10px] tracking-[0.3em] text-steel">{product.code}</p>
              <StatusBadge status={product.status} />
            </div>
            <h1 className="mt-4 font-display text-5xl uppercase leading-[0.9] text-bone sm:text-6xl">
              {product.name}
            </h1>
            <p className="mt-6 text-lg text-bone">
              {formatPrice(product.price)}
              <span className="ml-3 text-[9px] uppercase tracking-[0.25em] text-steel">
                Mock price
              </span>
            </p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-steel">
              Color — {product.color}
            </p>

            <fieldset className="mt-10">
              <legend className="text-[10px] uppercase tracking-[0.3em] text-steel">
                Size
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {product.variants.map((v) => {
                  const soldOut = v.status === "SOLD_OUT";
                  return (
                    <button
                      key={v.id}
                      type="button"
                      data-testid={`size-option-${v.size.toLowerCase()}`}
                      disabled={soldOut}
                      onClick={() => setVariantId(v.id)}
                      aria-pressed={variantId === v.id}
                      className={`min-w-12 border px-4 py-3 text-xs tracking-[0.15em] transition-colors duration-200 ${
                        soldOut
                          ? "cursor-not-allowed border-graphite text-graphite line-through"
                          : variantId === v.id
                            ? "border-bone bg-bone text-bg"
                            : "border-graphite text-bone hover:border-steel"
                      }`}
                    >
                      {v.size}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <button
              type="button"
              data-testid="add-to-bag-button"
              disabled={!purchasable}
              onClick={onAdd}
              className={`mt-10 w-full border py-5 text-xs font-bold uppercase tracking-[0.3em] transition-colors duration-300 ${
                purchasable
                  ? "border-bone bg-bone text-bg hover:bg-transparent hover:text-bone"
                  : "cursor-not-allowed border-graphite text-graphite"
              }`}
            >
              {ctaLabel}
            </button>

            <div className="mt-10 divide-y divide-graphite border-y border-graphite">
              {[
                { title: "Description", body: product.description },
                { title: "Materials", body: product.materials },
                {
                  title: "Shipping & Returns",
                  body: "[INFORMATION PENDING] — fulfillment rules are not defined in this prototype.",
                },
              ].map((row) => (
                <details key={row.title} className="group py-4" data-testid={`accordion-${row.title.toLowerCase().replace(/[^a-z]/g, "-")}`}>
                  <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] uppercase tracking-[0.25em] text-bone">
                    {row.title}
                    <span aria-hidden className="transition-transform duration-300 group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-xs leading-relaxed text-steel">{row.body}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="mt-28">
          <h2
            id="related-heading"
            className="font-display text-3xl uppercase text-bone sm:text-4xl"
          >
            Related objects
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
