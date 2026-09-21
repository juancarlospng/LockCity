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
}: {
  id: string;
  scene: string;
  title: string;
  copy?: string;
  products: Product[];
  ctaHref: string;
  ctaLabel: string;
}) {
  if (products.length === 0) return null;
  return (
    <section
      id={id}
      data-testid={`${id}-section`}
      aria-labelledby={`${id}-heading`}
      className="border-t border-graphite px-4 py-24 sm:px-8 lg:px-12 lg:py-36"
    >
      <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <Reveal>
            <p className="text-[10px] uppercase tracking-[0.3em] text-steel">{scene}</p>
          </Reveal>
          <h2
            id={`${id}-heading`}
            className="mt-6 font-display text-6xl uppercase leading-[0.9] text-bone sm:text-8xl"
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

      <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product, index) => (
          <ProductCard key={product.id} product={product} index={index} />
        ))}
      </div>
    </section>
  );
}
