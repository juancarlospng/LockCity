"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
/** No Three import here: unsupported/reduced/mobile sessions keep only the poster. */
export function SceneGate({
  children,
  className = "",
  priority = false,
}: {
  children: ReactNode;
  className?: string;
  priority?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = matchMedia("(min-width: 1024px) and (pointer: fine)");
    let near = false;
    const update = () =>
      setEnabled(
        near &&
          !reduced.matches &&
          desktop.matches &&
          !(navigator as Navigator & { connection?: { saveData?: boolean } })
            .connection?.saveData,
      );
    const io = new IntersectionObserver(
      ([entry]) => {
        near = entry.isIntersecting;
        update();
      },
      { rootMargin: priority ? "0px" : "160px" },
    );
    if (ref.current) io.observe(ref.current);
    reduced.addEventListener("change", update);
    desktop.addEventListener("change", update);
    return () => {
      io.disconnect();
      reduced.removeEventListener("change", update);
      desktop.removeEventListener("change", update);
    };
  }, [priority]);
  return (
    <div
      ref={ref}
      className={className}
      data-scene-gate={enabled ? "enhanced" : "static"}
    >
      <img
        src="/assets/city-poster.webp"
        alt=""
        width={1536}
        height={1024}
        fetchPriority={priority ? "high" : "auto"}
        loading={priority ? "eager" : "lazy"}
        className="absolute inset-0 h-full w-full object-cover opacity-60"
      />
      {enabled && children}
    </div>
  );
}
