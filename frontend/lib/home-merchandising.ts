import { AW26_PRODUCT_IDS, AW26_VISIBLE, isPublicStoreProduct } from "./merchandising";
import type { Product } from "./types";

export const HOME_HERO_PRODUCT_IDS = [3292, 2911, 3011] as const;
export const HOME_CORE_PRODUCT_IDS = [3292, 3011, 3058, 3179, 3214] as const;
export const HOME_SELECTED_PRODUCT_IDS = [2415, 3699, 3704, 2911, 3149] as const;
export const HOME_EDITORIAL_PRODUCT_IDS = [3011, 3292] as const;
export const HOME_AW26_PRODUCT_IDS = AW26_PRODUCT_IDS;
export const HOME_AW26_VISIBLE = AW26_VISIBLE;

function productsById(products: Product[], ids: readonly number[]): Product[] {
  const byId = new Map(
    products
      .filter((product) => isPublicStoreProduct(product.wooProductId))
      .map((product) => [product.wooProductId, product]),
  );
  return ids.flatMap((id) => {
    const product = byId.get(id);
    return product ? [product] : [];
  });
}

export function homeHeroProduct(products: Product[]): Product | undefined {
  return productsById(products, HOME_HERO_PRODUCT_IDS)[0];
}

export function homeCoreProducts(products: Product[]): Product[] {
  return productsById(products, HOME_CORE_PRODUCT_IDS);
}

export function homeSelectedProducts(products: Product[]): Product[] {
  return productsById(products, HOME_SELECTED_PRODUCT_IDS);
}

export function homeEditorialProducts(products: Product[]): Product[] {
  return productsById(products, HOME_EDITORIAL_PRODUCT_IDS);
}

export function homeAw26Products(products: Product[]): Product[] {
  return HOME_AW26_VISIBLE ? productsById(products, HOME_AW26_PRODUCT_IDS) : [];
}
