"use client";
import { useState } from "react";
export function ProductImage({
  src,
  alt,
  className = "",
  eager = false,
}: {
  src?: string;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  const [failedSrc, setFailedSrc] = useState<string>();
  return src && failedSrc !== src ? (
    <img
      src={src}
      alt={alt}
      width={800}
      height={1000}
      loading={eager ? "eager" : "lazy"}
      onError={() => setFailedSrc(src)}
      className={`aspect-[4/5] w-full object-cover ${className}`}
    />
  ) : (
    <div
      className={`media-empty ${className}`}
      role="img"
      aria-label="Image unavailable"
    >
      <span>Image unavailable</span>
    </div>
  );
}
