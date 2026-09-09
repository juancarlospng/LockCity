"use client";
import { useMemo, useState } from "react";
import { ProductCard, ProductCardPlaceholder } from "./ProductCard";
import { EmptyState } from "./EmptyState";
import { EMPTY_COPY } from "@/lib/content";
import type { Product } from "@/lib/types";
export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="product-grid">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
export function ShopGrid({
  products,
  loading = false,
}: {
  products: Product[];
  loading?: boolean;
}) {
  const [category, setCategory] = useState("All");
  const categories = useMemo(
    () => [
      "All",
      ...new Set(products.flatMap((p) => (p.category ? [p.category] : []))),
    ],
    [products],
  );
  const visible =
    category === "All"
      ? products
      : products.filter((p) => p.category === category);
  if (loading)
    return (
      <div
        role="status"
        aria-label="Loading products"
        className="product-grid mt-12"
      >
        {[0, 1, 2].map((i) => (
          <ProductCardPlaceholder key={i} />
        ))}
      </div>
    );
  return (
    <div className="mt-12">
      <div className="flex flex-wrap items-center justify-between gap-4 border-y border-graphite py-4">
        <span className="eyebrow">Clothing & objects</span>
        {categories.length > 1 && (
          <label className="text-sm">
            Category{" "}
            <select
              className="lc-input ml-3 !w-auto"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      {visible.length ? (
        <div className="mt-8">
          <ProductGrid products={visible} />
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState
            testid="shop-empty-state"
            kicker="Shop Lock City"
            {...EMPTY_COPY.shop}
            ctaHref="/drops"
            ctaLabel="Explore next drop →"
          />
          <div className="product-grid mt-8" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <ProductCardPlaceholder key={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
