import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { MaskText, Reveal } from "@/components/Reveal";
import type { Product } from "@/lib/types";

export function ProductShowcase({
  id,
  scene,
  title,
  copy,
  products,
  ctaHref,
  ctaLabel,
  layout = "grid",
}: {
  id: string;
  scene: string;
  title: string;
  copy?: string;
  products: Product[];
  ctaHref: string;
  ctaLabel: string;
  layout?: "editorial" | "grid";
}) {
  if (products.length === 0) return null;
  return (
    <section
      id={id}
      data-testid={`${id}-section`}
      aria-labelledby={`${id}-heading`}
      className="border-t border-graphite px-4 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-32"
    >
      <div className="mx-auto max-w-[1800px]">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <Reveal>
              <p className="text-[10px] uppercase tracking-[0.3em] text-steel">{scene}</p>
            </Reveal>
            <h2
              id={`${id}-heading`}
              className="mt-5 max-w-5xl font-display text-6xl uppercase leading-[0.88] text-bone sm:text-8xl lg:text-9xl"
            >
              <MaskText lines={[title]} />
            </h2>
            {copy ? <p className="mt-7 max-w-xl text-sm leading-7 text-steel">{copy}</p> : null}
          </div>
          <Link
            href={ctaHref}
            className="link-line w-fit text-xs uppercase tracking-[0.3em] text-bone"
          >
            {ctaLabel} →
          </Link>
        </div>

        <div className={`mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:mt-16 ${
          layout === "editorial" ? "lg:grid-cols-12" : "lg:grid-cols-3 xl:grid-cols-5"
        }`}>
          {products.map((product, index) => (
            <div
              key={product.id}
              className={layout === "editorial"
                ? index === 0
                  ? "lg:col-span-7 lg:row-span-2"
                  : index < 3
                    ? "lg:col-span-5"
                    : "lg:col-span-6"
                : undefined}
            >
              <ProductCard product={product} index={index} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
