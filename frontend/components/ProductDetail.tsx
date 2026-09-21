"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Media } from "@/components/Media";
import { ProductCard } from "@/components/ProductCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useCart } from "@/lib/cart";
import { cartErrorMessage } from "@/lib/cart-core";
import { getColorAccent, isColorAttribute } from "@/lib/color-accent";
import { orderedProductImages } from "@/lib/product-media";
import { selectSize as trackSelectSize, viewItem } from "@/lib/analytics";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import {
  canPurchaseVariant,
  findExactVariant,
  getVariantOptions,
  variantSelection,
  type VariantSelection,
} from "@/lib/variant-selection";

export function ProductDetail({
  product,
  related,
}: {
  product: Product;
  related: Product[];
}) {
  const { addItem } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const [frame, setFrame] = useState(0);
  const thumbnailStrip = useRef<HTMLDivElement>(null);
  const initialVariant = product.type === "simple"
    ? product.variants[0]
    : product.variants.find(canPurchaseVariant) ?? product.variants[0];
  const [selection, setSelection] = useState<VariantSelection>(
    initialVariant ? variantSelection(initialVariant) : {},
  );

  useEffect(() => {
    viewItem({
      item_id: product.id,
      item_name: product.name,
      item_category: product.category,
      price: product.price,
    });
  }, [product]);

  const optionGroups = useMemo(() => getVariantOptions(product.variants), [product.variants]);
  const selectedVariant = product.type === "simple"
    ? product.variants[0]
    : findExactVariant(product.variants, selection);
  const validSelection = optionGroups.length > 0 && Object.keys(selection).length === optionGroups.length;
  const canAdd = canPurchaseVariant(selectedVariant);
  const selectedStatus = selectedVariant?.status ?? (validSelection ? "UNKNOWN" : product.status);
  const ctaLabel = !validSelection && product.type === "variable"
    ? "Select all options"
    : !selectedVariant
      ? "Combination unavailable"
      : !selectedVariant.availability?.is_purchasable
        ? "Unavailable"
        : !selectedVariant.availability?.is_in_stock
          ? "Sold out"
          : selectedVariant.status === "PRE_ORDER"
            ? "Pre-order"
            : "Add to bag";

  const onAdd = async () => {
    if (!canAdd || !selectedVariant || isAdding) return;
    setIsAdding(true);
    try {
      await addItem(product, selectedVariant);
      toast.success(`${product.name} — added to bag`);
    } catch (cause) {
      toast.error(cartErrorMessage(cause));
    } finally {
      setIsAdding(false);
    }
  };

  const images = useMemo(() => {
    const selectedImage = selectedVariant?.image;
    const ordered = orderedProductImages(product);
    return selectedImage
      ? [selectedImage, ...ordered.filter((image) => image !== selectedImage)]
      : ordered;
  }, [product, selectedVariant?.image]);

  const scrollThumbnails = (direction: -1 | 1) => {
    thumbnailStrip.current?.scrollBy({ left: direction * 276, behavior: "smooth" });
  };

  useEffect(() => setFrame(0), [selectedVariant?.id]);
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
              <div className="aspect-[4/5] w-full bg-[#f2f1ed] p-4 sm:p-8 lg:p-10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={images[frame] ?? images[0]}
                  alt={product.name}
                  className="h-full w-full object-contain"
                />
              </div>
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
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollThumbnails(-1)}
                aria-label="Previous product images"
                className="h-20 w-8 shrink-0 border border-graphite text-sm text-steel transition-colors hover:border-bone hover:text-bone"
              >
                ←
              </button>
              <div
                ref={thumbnailStrip}
                data-testid="gallery-thumbnail-strip"
                className="flex min-w-0 flex-1 snap-x gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {images.map((src, i) => (
                  <button
                    key={`${src}-${i}`}
                    type="button"
                    data-testid={`gallery-frame-${i}`}
                    onClick={() => setFrame(i)}
                    aria-label={`View image ${i + 1}`}
                    aria-pressed={frame === i}
                    className={`h-20 w-20 shrink-0 snap-start border bg-[#f2f1ed] p-1 transition-colors duration-200 ${
                      frame === i ? "border-bone" : "border-graphite hover:border-steel"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-full w-full object-contain" />
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => scrollThumbnails(1)}
                aria-label="Next product images"
                className="h-20 w-8 shrink-0 border border-graphite text-sm text-steel transition-colors hover:border-bone hover:text-bone"
              >
                →
              </button>
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
              <StatusBadge status={selectedStatus} />
            </div>
            <h1 className="mt-4 font-display text-5xl uppercase leading-[0.9] text-bone sm:text-6xl">
              {product.name}
            </h1>
            <p className="mt-6 text-lg text-bone">
              {selectedVariant?.price !== undefined
                ? formatPrice(selectedVariant.price, selectedVariant.currency ?? product.currency)
                : formatPrice(product.price, product.currency)}
              {!selectedVariant && product.priceRange && product.priceRange.max !== product.price &&
                ` – ${formatPrice(product.priceRange.max, product.currency)}`}
            </p>
            {product.type === "variable" && (
              <div className="mt-3 text-xs text-steel">
                {selectedVariant ? (
                  <p data-testid="selected-variation-id" data-variation-id={selectedVariant.wooVariationId}>
                    {selectedVariant.sku ? `SKU ${selectedVariant.sku}` : "Option selected"}
                  </p>
                ) : validSelection ? (
                  <p data-testid="invalid-variant-combination">This combination is not available.</p>
                ) : (
                  <p data-testid="incomplete-variant-selection">Select all options.</p>
                )}
                {selectedVariant?.availability?.low_stock_remaining != null && (
                  <p data-testid="variant-low-stock">
                    Only {selectedVariant.availability.low_stock_remaining} left
                  </p>
                )}
              </div>
            )}
            {product.color && (
              <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-steel">
                Color — {product.color}
              </p>
            )}

            {product.type === "variable" ? optionGroups.map((group) => (
              <fieldset key={group.key} className="mt-8" data-testid={`variant-attribute-${group.key}`}>
                <legend className="text-[10px] uppercase tracking-[0.3em] text-steel">{group.name}</legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {group.values.map((value) => {
                    const selected = selection[group.key] === value;
                    const colorAccent = isColorAttribute(group.name) ? getColorAccent(value) : undefined;
                    const candidate = findExactVariant(product.variants, {
                      ...selection,
                      [group.key]: value,
                    });
                    const unavailable = Boolean(candidate && !canPurchaseVariant(candidate));
                    return (
                      <button
                        key={value}
                        type="button"
                        data-testid={`attribute-${group.key}-${value.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                        disabled={unavailable}
                        onClick={() => {
                          setSelection((current) => ({ ...current, [group.key]: value }));
                          if (/size|talla/i.test(group.name)) trackSelectSize(product.id, value);
                        }}
                        aria-pressed={selected}
                        className={`relative min-w-12 overflow-hidden border px-4 py-3 text-xs uppercase tracking-[0.15em] transition-colors duration-200 ${
                          unavailable
                            ? "cursor-not-allowed border-graphite text-graphite line-through"
                            : selected
                              ? "border-bone bg-bone text-bg"
                              : "border-graphite text-bone hover:border-steel"
                        }`}
                      >
                        {colorAccent ? (
                          <span
                            aria-hidden
                            data-testid={`color-accent-${value.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                            className="absolute inset-y-0 left-0 w-1.5 border-r"
                            style={colorAccent}
                          />
                        ) : null}
                        <span className={colorAccent ? "pl-1" : undefined}>{value}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )) : (
              <fieldset className="mt-10">
                <legend className="text-[10px] uppercase tracking-[0.3em] text-steel">Size</legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      data-testid={`size-option-${v.id}`}
                      disabled={!canPurchaseVariant(v)}
                      aria-pressed={selectedVariant?.id === v.id}
                      className={`min-w-12 border px-4 py-3 text-xs tracking-[0.15em] transition-colors duration-200 ${
                        !canPurchaseVariant(v)
                          ? "cursor-not-allowed border-graphite text-graphite line-through"
                          : selectedVariant?.id === v.id
                            ? "border-bone bg-bone text-bg"
                            : "border-graphite text-bone hover:border-steel"
                      }`}
                    >
                      {v.size}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            <button
              type="button"
              data-testid="add-to-bag-button"
              disabled={!canAdd || isAdding}
              onClick={onAdd}
              className={`mt-10 w-full border py-5 text-xs font-bold uppercase tracking-[0.3em] transition-colors duration-300 ${
                canAdd && !isAdding
                  ? "border-bone bg-bone text-bg hover:bg-transparent hover:text-bone"
                  : "cursor-not-allowed border-graphite text-graphite"
              }`}
            >
              {isAdding ? "Adding…" : ctaLabel}
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
