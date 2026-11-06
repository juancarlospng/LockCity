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

function mediaToken(value: string): string {
  let decoded = value;
  try { decoded = decodeURIComponent(value); }
  catch { /* Keep the original value when a source contains invalid escapes. */ }
  return decoded.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function shouldPrioritizeVariantImage(source?: ProductImage): boolean {
  const text = sourceText(source);
  return !/\bback\b|\brear\b|flat[ -]?lay|print[ -]?file|design[ -]?file|template/i.test(text);
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

export function productImagesForColor(
  product: Pick<Product, "images" | "sourceImages">,
  color?: string,
): string[] {
  const ordered = product.images
    .map((src, index) => ({ src, index, source: product.sourceImages[index] }))
    .sort((a, b) => productImageScore(b.source, b.index) - productImageScore(a.source, a.index) || a.index - b.index);
  const colorToken = color ? mediaToken(color) : "";
  if (!colorToken) return ordered.map(({ src }) => src);

  const matching = ordered.filter(({ source }) => mediaToken(sourceText(source)).includes(colorToken));
  if (matching.length === 0) return ordered.map(({ src }) => src);
  const matchingSources = new Set(matching.map(({ src }) => src));
  return [...matching, ...ordered.filter(({ src }) => !matchingSources.has(src))].map(({ src }) => src);
}

export function mainProductImage(product: Pick<Product, "images" | "sourceImages">): string | undefined {
  return orderedProductImages(product)[0];
}
