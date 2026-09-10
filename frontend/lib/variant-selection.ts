import type { ProductVariant } from "./types";

export type VariantSelection = Record<string, string>;

export function attributeKey(name: string) {
  return name.trim().toLocaleLowerCase();
}

export function variantSelection(variant: ProductVariant): VariantSelection {
  return Object.fromEntries(
    (variant.attributes ?? []).map((attribute) => [attributeKey(attribute.name), attribute.value]),
  );
}

export function getVariantOptions(variants: ProductVariant[]) {
  const groups = new Map<string, { key: string; name: string; values: string[] }>();
  for (const variant of variants) {
    for (const attribute of variant.attributes ?? []) {
      const key = attributeKey(attribute.name);
      const group = groups.get(key) ?? { key, name: attribute.name, values: [] };
      if (!group.values.includes(attribute.value)) group.values.push(attribute.value);
      groups.set(key, group);
    }
  }
  return [...groups.values()];
}

export function findExactVariant(
  variants: ProductVariant[],
  selection: VariantSelection,
): ProductVariant | undefined {
  const selectedEntries = Object.entries(selection);
  if (!selectedEntries.length) return undefined;
  const matches = variants.filter((variant) => {
    const attributes = variantSelection(variant);
    const entries = Object.entries(attributes);
    return entries.length === selectedEntries.length &&
      entries.every(([key, value]) => selection[key] === value);
  });
  return matches.length === 1 ? matches[0] : undefined;
}

export function canPurchaseVariant(variant?: ProductVariant) {
  return Boolean(
    variant &&
    variant.detailsState === "resolved" &&
    variant.availability?.is_purchasable === true &&
    variant.availability?.is_in_stock === true &&
    (variant.status === "AVAILABLE" || variant.status === "PRE_ORDER") &&
    variant.price !== undefined,
  );
}
