"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatPrice } from "@/lib/utils";

interface SearchResult {
  id: number;
  name: string;
  slug: string;
  prices?: { price?: string; currency_code?: string; currency_minor_unit?: number };
}

export function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [available, setAvailable] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/store/products?search=${encodeURIComponent(q)}&per_page=8`,
          { signal: controller.signal }
        );
        if (res.status === 503) {
          setAvailable(false);
          return;
        }
        if (!res.ok) throw new Error();
        setAvailable(true);
        setResults(await res.json());
      } catch {
        if (!controller.signal.aborted) setAvailable(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
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
            Search the city
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
          placeholder="TYPE TO SEARCH"
          className="mt-8 w-full border-b border-graphite bg-transparent pb-4 font-display text-4xl uppercase text-bone placeholder:text-graphite focus:border-bone focus:outline-none sm:text-5xl"
          aria-label="Search products"
        />
        <div className="mt-10 flex flex-col divide-y divide-graphite overflow-y-auto">
          {!available && (
            <p
              data-testid="search-unavailable"
              className="py-6 text-xs uppercase tracking-[0.25em] text-steel"
            >
              Search opens with the first drop
            </p>
          )}
          {available && query && results.length === 0 && (
            <p className="py-6 text-xs uppercase tracking-[0.25em] text-steel">
              Nothing found
            </p>
          )}
          {results.map((p) => (
            <Link
              key={p.id}
              href={`/product/${p.slug}`}
              data-testid={`search-result-${p.id}`}
              className="group flex items-center justify-between py-5"
            >
              <p className="font-display text-2xl uppercase text-bone transition-transform duration-300 group-hover:translate-x-2">
                {p.name}
              </p>
              <span className="text-xs text-steel">
                {formatPrice(
                  Number(p.prices?.price ?? 0) / 10 ** (p.prices?.currency_minor_unit ?? 2),
                  p.prices?.currency_code ?? "EUR"
                )}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
