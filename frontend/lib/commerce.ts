import { MOCK_COLLECTIONS, MOCK_DROPS, MOCK_PRODUCTS } from "./mock-data";
import type { Collection, Drop, Product } from "./types";

// ─────────────────────────────────────────────────────────────
// COMMERCE ADAPTER LAYER
// The UI only talks to this interface. In production this will be
// swapped for LockCityApiAdapter -> LOCK CITY ADMIN API
// (WooCommerce / Printful / Stripe / PayPal / Email / Affiliates).
// No provider is ever called from the frontend.
// ─────────────────────────────────────────────────────────────

export interface CommerceAdapter {
  getProducts(): Promise<Product[]>;
  getProductBySlug(slug: string): Promise<Product | undefined>;
  getCollections(): Promise<Collection[]>;
  getCollectionBySlug(slug: string): Promise<Collection | undefined>;
  getProductsByCollection(slug: string): Promise<Product[]>;
  getDrops(): Promise<Drop[]>;
}

const tick = () => new Promise((r) => setTimeout(r, 40));

export class MockCommerceAdapter implements CommerceAdapter {
  async getProducts() {
    await tick();
    return MOCK_PRODUCTS;
  }
  async getProductBySlug(slug: string) {
    await tick();
    return MOCK_PRODUCTS.find((p) => p.slug === slug);
  }
  async getCollections() {
    await tick();
    return MOCK_COLLECTIONS;
  }
  async getCollectionBySlug(slug: string) {
    await tick();
    return MOCK_COLLECTIONS.find((c) => c.slug === slug);
  }
  async getProductsByCollection(slug: string) {
    await tick();
    return MOCK_PRODUCTS.filter((p) => p.collection === slug);
  }
  async getDrops() {
    await tick();
    return MOCK_DROPS;
  }
}

// Future: export class LockCityApiAdapter implements CommerceAdapter { ... }
export const commerce: CommerceAdapter = new MockCommerceAdapter();
