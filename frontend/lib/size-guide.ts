import type { ProductSizeGuideContent } from "./types";

export type SizeGuideUnit = "cm" | "in";

function normalizedSize(value: string): string {
  return value.trim().toUpperCase().replaceAll(" ", "");
}

function formatNumber(value: number, maximumDecimals: number): string {
  return value.toFixed(maximumDecimals).replace(/\.?0+$/, "");
}

export function measurementValue(valueCm: number, unit: SizeGuideUnit): string {
  return unit === "cm"
    ? formatNumber(valueCm, 3)
    : formatNumber(valueCm / 2.54, 2);
}

export function sizeGuideTable(content?: ProductSizeGuideContent, soldSizes?: string[]) {
  if (!content?.sizes?.length || !content.measurements?.length) return undefined;
  const sold = soldSizes?.length ? new Set(soldSizes.map(normalizedSize)) : undefined;
  const indexes = content.sizes
    .map((size, index) => ({ size, index }))
    .filter(({ size }) => !sold || sold.has(normalizedSize(size)));
  if (!indexes.length) return undefined;
  const measurements = content.measurements
    .map((measurement) => ({
      label: measurement.label,
      valuesCm: indexes.map(({ index }) => measurement.valuesCm[index]),
    }))
    .filter((measurement) => measurement.valuesCm.every((value) => Number.isFinite(value) && value > 0));
  if (!measurements.length) return undefined;
  return { sizes: indexes.map(({ size }) => size), measurements };
}
