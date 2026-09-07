"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Media } from "@/components/Media";
import { ProductCard } from "@/components/ProductCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useCart } from "@/lib/cart";
import { selectSize as trackSelectSize, viewItem } from "@/lib/analytics";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

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

  useEffect(() => {
    viewItem({
      item_id: product.id,
      item_name: product.name,
      item_category: product.category,
      price: product.price,
    });
  }, [product]);

  const purchasable =
    product.status === "AVAILABLE" || product.status === "PRE_ORDER";
  const selectedVariant = product.variants.find((v) => v.id === variantId);

  const ctaLabel = !purchasable
    ? product.status === "COMING_SOON"
      ? "Coming soon"
      : "Sold out"
    : product.status === "PRE_ORDER"
      ? "Pre-order"
      : "Add to bag";

  const onAdd = () => {
    if (!purchasable || !selectedVariant) return;
    addItem(product, selectedVariant);
    toast.success(`${product.name} — added to bag`);
  };

  const images = product.images;
  const details = [
    product.description && { title: "Description", body: product.description },
    product.materials && { title: "Materials", body: product.materials },
    product.fit && { title: "Fit", body: product.fit },
  ].filter(Boolean) as { title: string; body: string }[];

  return (
    <div data-testid="product-page" className="px-4 pb-24 pt-32 sm:px-8 lg:px-12 lg:pt-40">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div data-testid="product-gallery" className="border border-graphite">
            {images.length > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={images[frame] ?? images[0]}
                alt={product.name}
                className="aspect-[4/5] w-full object-cover"
              />
            ) : (
              <div>
                <Media
                  seed={product.id.length * 29 + frame}
                  code={product.code}
                  className="min-h-[380px] lg:min-h-[620px]"
                />
                <p className="border-t border-graphite px-4 py-3 text-[9px] uppercase tracking-[0.25em] text-steel">
                  Product photography coming soon
                </p>
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-4 flex gap-3">
              {images.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  data-testid={`gallery-frame-${i}`}
                  onClick={() => setFrame(i)}
                  aria-label={`View image ${i + 1}`}
                  aria-pressed={frame === i}
                  className={`w-20 border transition-colors duration-200 ${
                    frame === i ? "border-bone" : "border-graphite hover:border-steel"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="aspect-square w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <div className="flex items-center justify-between">
              {product.code ? (
                <p className="text-[10px] tracking-[0.3em] text-steel">{product.code}</p>
              ) : (
                <span />
              )}
              <StatusBadge status={product.status} />
            </div>
            <h1 className="mt-4 font-display text-5xl uppercase leading-[0.9] text-bone sm:text-6xl">
              {product.name}
            </h1>
            <p className="mt-6 text-lg text-bone">
              {formatPrice(product.price, product.currency)}
            </p>
            {product.color && (
              <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-steel">
                Color — {product.color}
              </p>
            )}

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
                      onClick={() => {
                        setVariantId(v.id);
                        trackSelectSize(product.id, v.size);
                      }}
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

            {details.length > 0 && (
              <div className="mt-10 divide-y divide-graphite border-y border-graphite">
                {details.map((row) => (
                  <details
                    key={row.title}
                    className="group py-4"
                    data-testid={`accordion-${row.title.toLowerCase()}`}
                  >
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
            )}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="mt-28">
          <h2
            id="related-heading"
            className="font-display text-3xl uppercase text-bone sm:text-4xl"
          >
            Related
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
