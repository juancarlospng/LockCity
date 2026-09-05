"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { MOCK_PRODUCTS } from "@/lib/mock-data";
import { formatPrice } from "@/lib/utils";

export function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return MOCK_PRODUCTS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <motion.div
      data-testid="search-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[95] bg-bg/95 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      <div className="mx-auto flex h-full max-w-3xl flex-col px-6 pt-24">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.3em] text-steel">
            Search the city — Mock index
          </span>
          <button
            type="button"
            data-testid="search-close-button"
            onClick={onClose}
            className="text-[11px] uppercase tracking-[0.25em] text-steel transition-colors hover:text-bone"
          >
            Close
          </button>
        </div>
        <input
          ref={inputRef}
          data-testid="search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="TYPE TO SEARCH OBJECTS"
          className="mt-8 w-full border-b border-graphite bg-transparent pb-4 font-display text-4xl uppercase text-bone placeholder:text-graphite focus:border-bone focus:outline-none sm:text-5xl"
          aria-label="Search objects"
        />
        <div className="mt-10 flex flex-col divide-y divide-graphite overflow-y-auto">
          {query && results.length === 0 && (
            <p className="py-6 text-xs uppercase tracking-[0.25em] text-steel">
              No objects found — Mock data
            </p>
          )}
          {results.map((p) => (
            <Link
              key={p.id}
              href={`/product/${p.slug}`}
              data-testid={`search-result-${p.id}`}
              className="group flex items-center justify-between py-5"
            >
              <div>
                <p className="text-[10px] tracking-[0.3em] text-steel">{p.code}</p>
                <p className="mt-1 font-display text-2xl uppercase text-bone transition-transform duration-300 group-hover:translate-x-2">
                  {p.name}
                </p>
              </div>
              <span className="text-xs text-steel">{formatPrice(p.price)} — Mock</span>
            </Link>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
