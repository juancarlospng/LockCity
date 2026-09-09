"use client";
import { useState } from "react";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { ProductGallery } from "./ProductGallery";
import { ProductGrid } from "./ShopGrid";
import { SizeSelector } from "./SizeSelector";
import Link from "./StoreLink";
export function ProductDetail({
  product,
  related = [],
}: {
  product?: Product;
  related?: Product[];
}) {
  const [size, setSize] = useState<string>();
  const [color, setColor] = useState<string>();
  const colors = product?.colors || [
    ...new Set(
      product?.variants.flatMap((v) => (v.color ? [v.color] : [])) || [],
    ),
  ];
  const variants =
    product?.variants.filter((v) => !color || v.color === color) || [];
  const sizes = product?.sizes || [...new Set(variants.map((v) => v.size))];
  const details = [
    ["Fit", product?.fit],
    ["Size guide", product?.sizeGuide],
    ["Model height", product?.modelHeight],
    ["Model size worn", product?.modelSizeWorn],
    ["Material", product?.materials],
    ["Fabric weight / GSM", product?.gsm ? `${product.gsm} GSM` : undefined],
    ["Construction", product?.construction],
    ["Description", product?.description],
    ["Product story", product?.story],
    ["Shipping information", product?.shipping],
    ["Returns information", product?.returns],
  ];
  return (
    <div data-testid="product-page" className="page-shell">
      <Link href="/shop" className="eyebrow">
        ← Shop Lock City
      </Link>
      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        <ProductGallery product={product} />
        <div>
          <p className="eyebrow text-steel">
            {product?.category || "Clothing & objects"}
          </p>
          <h1 className="section-title">
            {product?.commercialName || product?.name || "Product unavailable"}
          </h1>
          {(product?.objectCode || product?.code) && (
            <p className="eyebrow mt-4 text-steel">
              {product.objectCode || product.code}
            </p>
          )}
          <p className="mt-6 text-xl">
            {formatPrice(product?.price, product?.currency)}
          </p>
          <p className="mt-3 text-sm text-steel">
            {product?.availability ||
              "Product details are not available at this address."}
          </p>
          <fieldset className="mt-8">
            <legend className="eyebrow">Color</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {colors.length ? (
                colors.map((c) => (
                  <button
                    type="button"
                    className="lc-choice"
                    key={c}
                    aria-pressed={c === color}
                    onClick={() => {
                      setColor(c);
                      setSize(undefined);
                    }}
                  >
                    {c}
                  </button>
                ))
              ) : (
                <p className="text-sm text-steel">
                  Colors will be listed with the product.
                </p>
              )}
            </div>
          </fieldset>
          <SizeSelector
            sizes={sizes}
            selected={size}
            onSelect={setSize}
            disabledSizes={sizes.filter(
              (s) =>
                variants.some((v) => v.size === s) &&
                !variants.some((v) => v.size === s && v.status === "AVAILABLE"),
            )}
          />
          <button
            type="button"
            disabled
            className="lc-button mt-8 w-full"
            aria-describedby="purchase-note"
          >
            Add to bag
          </button>
          <p id="purchase-note" className="mt-3 text-sm text-steel">
            Online purchasing is not available here yet.
          </p>
          <div className="mt-8 divide-y divide-graphite border-y border-graphite">
            {details.map(([title, body]) => (
              <details key={title} className="py-4">
                <summary className="cursor-pointer py-2 text-sm uppercase">
                  {title}
                </summary>
                <p className="py-3 text-sm leading-relaxed text-steel">
                  {body || "Details will be available with this product."}
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>
      {!!product?.socialProof?.length && (
        <section className="mt-16">
          <h2 className="section-title">In their words</h2>
          {product.socialProof.map((entry, index) => (
            <figure key={index} className="mt-8 border-l border-graphite pl-6">
              <blockquote>{entry.quote}</blockquote>
              <figcaption className="mt-4 text-sm text-steel">{entry.attribution}</figcaption>
            </figure>
          ))}
        </section>
      )}
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="section-title mb-8">Related products</h2>
          <ProductGrid products={related} />
        </section>
      )}
      {!!product?.bundles?.length && (
        <section className="mt-16">
          <h2 className="section-title mb-8">Wear together</h2>
          <ProductGrid products={product.bundles} />
        </section>
      )}
      {!!product?.peopleWearing?.length && (
        <section className="mt-16">
          <h2 className="section-title">People wearing this</h2>
          {product.peopleWearing.map((p) => (
            <Link
              key={p.id}
              className="lc-button mt-4"
              href={`/people/${p.slug}`}
            >
              {p.name} →
            </Link>
          ))}
        </section>
      )}
      {!!product?.creatorContent?.length && (
        <section className="mt-16">
          <h2 className="section-title">From the city</h2>
          {product.creatorContent.map((t) => (
            <Link
              key={t.id}
              className="lc-button mt-4"
              href={`/transmissions/${t.slug}`}
            >
              {t.title} →
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
