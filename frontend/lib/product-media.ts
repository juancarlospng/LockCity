import type { Product, ProductImage } from "./types";

const PREFERRED_SIGNALS: [RegExp, number][] = [
  [/\bmock[ -]?up\b/i, 100],
  [/\b3d\b|three[ -]?dimensional/i, 90],
  [/\bmodel\b|on[ -]?body|worn|lifestyle/i, 70],
  [/\bfront\b/i, 10],
];

const FLAT_SIGNALS: [RegExp, number][] = [
  [/flat[ -]?lay|\bflat\b/i, -70],
  [/print[ -]?file|design[ -]?file|template/i, -90],
  [/\bback\b|rear/i, -10],
];

function sourceText(source?: ProductImage): string {
  return [source?.name, source?.alt, source?.src].filter(Boolean).join(" ");
}

export function productImageScore(source: ProductImage | undefined, index: number): number {
  const text = sourceText(source);
  const signalScore = [...PREFERRED_SIGNALS, ...FLAT_SIGNALS]
    .reduce((total, [pattern, score]) => total + (pattern.test(text) ? score : 0), 0);
  // WooCommerce order remains the tie-breaker when metadata has no useful signal.
  return signalScore - index * 0.01;
}

export function orderedProductImages(product: Pick<Product, "images" | "sourceImages">): string[] {
  return product.images
    .map((src, index) => ({ src, index, score: productImageScore(product.sourceImages[index], index) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ src }) => src);
}

export function mainProductImage(product: Pick<Product, "images" | "sourceImages">): string | undefined {
  return orderedProductImages(product)[0];
}
