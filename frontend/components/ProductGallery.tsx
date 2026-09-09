"use client";
import { useState } from "react";
import type { Product, ProductMedia } from "@/lib/types";
import { ProductImage } from "./ProductImage";
export function ProductGallery({ product }: { product?: Product }) {
  const [frame, setFrame] = useState(0);
  const media: ProductMedia[] = product?.media?.length
    ? product.media
    : [
        ...(product?.images || []).map((src) => ({
          src,
          alt: product?.commercialName || product?.name || "",
          kind: "product" as const,
        })),
        ...(product?.videos || []).map((src) => ({
          src,
          alt: "Product film",
          kind: "video" as const,
        })),
      ];
  const active = media[frame];
  return (
    <div data-testid="product-gallery">
      <div className="border border-graphite">
        {active?.kind === "video" ? (
          <video
            controls
            preload="none"
            poster={active.poster}
            aria-label={active.alt}
            className="aspect-[4/5] w-full"
            src={active.src}
          />
        ) : (
          <ProductImage
            src={active?.src}
            alt={active?.alt || "Product photography"}
            eager
          />
        )}
      </div>
      {media.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {media.map((item, i) => (
            <button
              key={item.src}
              type="button"
              aria-pressed={i === frame}
              onClick={() => setFrame(i)}
              className="lc-choice"
              aria-label={`View ${item.kind} ${i + 1}`}
            >
              {i + 1} / {item.kind}
            </button>
          ))}
        </div>
      )}
      {product?.model3d && (
        <details className="mt-6 border border-graphite p-4">
          <summary>3D view</summary>
          <ProductImage
            src={product.model3d.poster}
            alt={product.model3d.alt}
          />
          <p className="mt-4 text-sm text-steel">
            Interactive viewing is not available for this item yet.
          </p>
        </details>
      )}
    </div>
  );
}
