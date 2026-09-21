import type { Product, ProductVariant } from "./types";
import { formatPrice } from "./utils";
import { canPurchaseVariant } from "./variant-selection";

export type ProductCardAction =
  | { kind: "select-options"; label: "Select options" }
  | { kind: "quick-add"; label: string; variant: ProductVariant }
  | { kind: "sold-out"; label: "Sold out" }
  | { kind: "unavailable"; label: "Unavailable" };

export function getProductCardAction(product: Product): ProductCardAction {
  const soldOut = product.status === "SOLD_OUT" || product.availability?.is_in_stock === false;
  if (soldOut) return { kind: "sold-out", label: "Sold out" };

  if (product.type === "variable") {
    return product.availability?.is_in_stock === true && product.availability?.is_purchasable === true
      ? { kind: "select-options", label: "Select options" }
      : { kind: "unavailable", label: "Unavailable" };
  }

  const variant = product.variants[0];
  const price = variant?.price ?? product.price;
  if (!canPurchaseVariant(variant) || !Number.isFinite(price) || price <= 0) {
    return { kind: "unavailable", label: "Unavailable" };
  }
  return {
    kind: "quick-add",
    label: `Quick add — ${formatPrice(price, variant.currency ?? product.currency)}`,
    variant,
  };
}
