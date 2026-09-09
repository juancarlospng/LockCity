import type { Product } from "./types";
/** Phase 1 local read boundary. Environment variables cannot enable commerce. */
export interface CommerceAdapter {
  readonly live: boolean;
  getProducts(): Promise<Product[]>;
  getProductBySlug(slug: string): Promise<Product | undefined>;
  getProductsByCollection(slug: string): Promise<Product[]>;
}
export class EmptyCommerceAdapter implements CommerceAdapter {
  readonly live = false;
  async getProducts(): Promise<Product[]> {
    return [];
  }
  async getProductBySlug(_slug: string): Promise<Product | undefined> {
    return undefined;
  }
  async getProductsByCollection(_slug: string): Promise<Product[]> {
    return [];
  }
}
export const commerce: CommerceAdapter = new EmptyCommerceAdapter();
