"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { isActiveDropProduct, isCoreProduct } from "@/lib/merchandising";
import type { Product } from "@/lib/types";

const SORTS = [
  { id: "featured", label: "Featured" },
  { id: "price-asc", label: "Price ↑" },
  { id: "price-desc", label: "Price ↓" },
] as const;

export function ShopGrid({ products }: { products: Product[] }) {
  const hasDrop = useMemo(() => products.some((product) => isActiveDropProduct(product.wooProductId)), [products]);
  const [filter, setFilter] = useState<string>("ALL");
  const [sort, setSort] = useState<(typeof SORTS)[number]["id"]>("featured");

  const visible = useMemo(() => {
    let list = [...products];
    if (filter === "CORE") list = list.filter((product) => isCoreProduct(product.wooProductId));
    if (filter === "DROP") list = list.filter((product) => isActiveDropProduct(product.wooProductId));
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    return list;
  }, [products, filter, sort]);

  return (
    <>
      <div className="mt-12 flex flex-col gap-5 border-y border-graphite py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filter products">
            {[{ slug: "ALL", name: "All" }, { slug: "CORE", name: "Core" }, ...(hasDrop ? [{ slug: "DROP", name: "Drop" }] : [])].map((c) => (
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
