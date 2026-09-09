"use client";
import { useState } from "react";
import { Modal } from "./Modal";
import Link from "./StoreLink";
export function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  return (
    <Modal label="Search products" onClose={onClose} testid="search-overlay">
      <div className="flex justify-between gap-6">
        <h2 className="font-display text-3xl uppercase">Search Lock City</h2>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
      <label htmlFor="product-search" className="mt-10 block text-sm">
        Search clothing & objects
      </label>
      <input
        id="product-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="lc-input mt-3"
        autoComplete="off"
      />
      <p role="status" className="mt-8 text-steel">
        {query
          ? "Product search will be available when the selection is ready."
          : "Explore the districts while the selection is being prepared."}
      </p>
      <Link href="/shop" onClick={onClose} className="lc-button mt-8">
        Shop Lock City →
      </Link>
    </Modal>
  );
}
