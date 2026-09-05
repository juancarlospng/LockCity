"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { MaskText } from "@/components/Reveal";
import { MOCK_PRODUCTS } from "@/lib/mock-data";
import type { Category } from "@/lib/types";

const FILTERS = ["NEW", "T-SHIRTS", "HOODIES", "BOTTOMS", "ACCESSORIES"] as const;
type Filter = (typeof FILTERS)[number] | "ALL";

const SORTS = [
  { id: "featured", label: "Featured" },
  { id: "price-asc", label: "Price ↑" },
  { id: "price-desc", label: "Price ↓" },
] as const;

export default function ShopPage() {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [sort, setSort] = useState<(typeof SORTS)[number]["id"]>("featured");

  const products = useMemo(() => {
    let list = [...MOCK_PRODUCTS];
    if (filter === "NEW") list = list.filter((p) => p.collection === "drop");
    else if (filter !== "ALL")
      list = list.filter((p) => p.category === (filter as Category));
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    return list;
  }, [filter, sort]);

  return (
    <div
      data-testid="shop-page"
      className="px-4 pb-24 pt-32 sm:px-8 lg:px-12 lg:pt-40"
    >
      <p className="text-[10px] uppercase tracking-[0.3em] text-steel">
        All objects — Mock data · Categories are placeholders
      </p>
      <h1 className="mt-4 font-display text-6xl uppercase leading-[0.85] text-bone sm:text-8xl lg:text-9xl">
        <MaskText lines={["Shop"]} />
      </h1>

      <div className="mt-12 flex flex-wrap items-center justify-between gap-6 border-y border-graphite py-4">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filter objects">
          {(["ALL", ...FILTERS] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              data-testid={`shop-filter-${f.toLowerCase().replace(/[^a-z]/g, "")}`}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-[10px] uppercase tracking-[0.25em] transition-colors duration-200 ${
                filter === f
                  ? "bg-bone text-bg"
                  : "text-steel hover:text-bone"
              }`}
            >
              {f}
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
        {products.length} object{products.length === 1 ? "" : "s"} found
      </p>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} />
        ))}
      </div>

      {products.length === 0 && (
        <p className="mt-20 text-center font-display text-3xl uppercase text-graphite">
          This district is empty
        </p>
      )}
    </div>
  );
}
