"use client";

import { useMemo, useState } from "react";
import { measurementValue, sizeGuideTable, type SizeGuideUnit } from "@/lib/size-guide";
import type { ProductSizeGuideContent } from "@/lib/types";

export function ProductSizeGuide({
  content,
  soldSizes,
}: {
  content?: ProductSizeGuideContent;
  soldSizes?: string[];
}) {
  const [unit, setUnit] = useState<SizeGuideUnit>("cm");
  const table = useMemo(() => sizeGuideTable(content, soldSizes), [content, soldSizes]);

  if (!content || (!table && !content.circumference)) return null;

  return (
    <details className="group py-4" data-testid="product-size-guide">
      <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] uppercase tracking-[0.25em] text-bone">
        Size guide
        <span aria-hidden className="transition-transform duration-300 group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="mt-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-[9px] uppercase tracking-[0.25em] text-steel">Measurements</p>
          <div className="flex border border-graphite" aria-label="Size guide unit">
            {(["cm", "in"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setUnit(value)}
                aria-pressed={unit === value}
                data-testid={`size-guide-unit-${value}`}
                className={`px-3 py-2 text-[9px] uppercase tracking-[0.2em] transition-colors ${
                  unit === value ? "bg-bone text-bg" : "text-steel hover:text-bone"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        {table ? (
          <div className="mt-4 max-w-full overflow-x-auto" data-testid="size-guide-table-scroll">
            <table className="min-w-max border-collapse text-left text-xs text-steel">
              <thead>
                <tr className="border-b border-graphite text-[9px] uppercase tracking-[0.2em] text-bone">
                  <th scope="col" className="whitespace-nowrap py-3 pr-8 font-normal">Size</th>
                  {table.sizes.map((size) => (
                    <th key={size} scope="col" className="min-w-16 whitespace-nowrap px-3 py-3 text-center font-normal">
                      {size}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.measurements.map((measurement) => (
                  <tr key={measurement.label} className="border-b border-graphite/70 last:border-0">
                    <th scope="row" className="whitespace-nowrap py-3 pr-8 font-normal text-bone">
                      {measurement.label}
                    </th>
                    {measurement.valuesCm.map((value, index) => (
                      <td key={`${measurement.label}-${table.sizes[index]}`} className="whitespace-nowrap px-3 py-3 text-center">
                        {measurementValue(value, unit)} {unit}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {content.circumference ? (
          <p className="mt-4 text-xs leading-relaxed text-steel" data-testid="size-guide-circumference">
            <span className="text-bone">{content.circumference.label}:</span>{" "}
            {unit === "cm" ? content.circumference.cm : content.circumference.inches}
          </p>
        ) : null}

        {content.notes?.length ? (
          <div className="mt-4 space-y-1 text-[10px] leading-5 text-steel" data-testid="size-guide-notes">
            {content.notes.map((note) => <p key={note}>{note}</p>)}
          </div>
        ) : null}
      </div>
    </details>
  );
}
