import type { ReactNode } from "react";
import { EmptyState } from "./EmptyState";
import { EMPTY_COPY } from "@/lib/content";
export function ContentIndex({
  kind,
  title,
  children,
  count,
}: {
  kind: keyof typeof EMPTY_COPY;
  title: string;
  children?: ReactNode;
  count: number;
}) {
  return (
    <div className="page-shell">
      <p className="eyebrow text-steel">Lock City Clothes</p>
      <h1 className="page-title">{title}</h1>
      <div className="mt-12">
        {count ? (
          <div className="product-grid">{children}</div>
        ) : (
          <EmptyState
            kicker={title}
            {...EMPTY_COPY[kind]}
            testid={`${kind}-empty-state`}
            ctaHref="/shop"
            ctaLabel="Shop Lock City →"
          />
        )}
      </div>
    </div>
  );
}
