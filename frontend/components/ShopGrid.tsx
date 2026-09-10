"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/lib/types";

const SORTS = [
  { id: "featured", label: "Featured" },
  { id: "price-asc", label: "Price ↑" },
  { id: "price-desc", label: "Price ↓" },
] as const;

export function ShopGrid({ products }: { products: Product[] }) {
  const categories = useMemo(
    () => Array.from(new Map(products.flatMap((p) => p.categories).map((c) => [c.slug, c])).values()),
    [products]
  );
  const [filter, setFilter] = useState<string>("ALL");
  const [sort, setSort] = useState<(typeof SORTS)[number]["id"]>("featured");

  const visible = useMemo(() => {
    let list = [...products];
    if (filter !== "ALL") list = list.filter((p) => p.categories.some((c) => c.slug === filter));
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    return list;
  }, [products, filter, sort]);

  return (
    <>
      {categories.length > 1 && (
        <div className="mt-12 flex flex-wrap items-center justify-between gap-6 border-y border-graphite py-4">
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filter products">
            {[{ slug: "ALL", name: "All" }, ...categories].map((c) => (
              <button
                key={c.slug}
                type="button"
                role="tab"
                aria-selected={filter === c.slug}
                data-testid={`shop-filter-${c.slug}`}
                onClick={() => setFilter(c.slug)}
                className={`px-4 py-2 text-[10px] uppercase tracking-[0.25em] transition-colors duration-200 ${
                  filter === c.slug ? "bg-bone text-bg" : "text-steel hover:text-bone"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-3 text-[10px] uppercase tracking-[0.25em] text-steel">
            Sort
            <select
              data-testid="shop-sort-select"
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="border border-graphite bg-bg px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-bone focus:border-bone focus:outline-none"
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <p className="mt-6 text-[10px] uppercase tracking-[0.25em] text-steel" aria-live="polite">
        {visible.length} product{visible.length === 1 ? "" : "s"}
      </p>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} />
        ))}
      </div>
    </>
  );
}
