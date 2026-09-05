import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { MaskText, Reveal } from "@/components/Reveal";
import { MOCK_PRODUCTS } from "@/lib/mock-data";

export function ShopTheDrop() {
  const products = MOCK_PRODUCTS.slice(0, 6);

  return (
    <section
      data-testid="shop-the-drop-section"
      aria-labelledby="shop-drop-heading"
      className="border-t border-graphite px-4 py-24 sm:px-8 lg:px-12 lg:py-36"
    >
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Reveal>
            <p className="text-[10px] uppercase tracking-[0.3em] text-steel">
              Scene 03 — Commerce zone · Mock data
            </p>
          </Reveal>
          <h2
            id="shop-drop-heading"
            className="mt-6 font-display text-5xl uppercase leading-[0.9] text-bone sm:text-7xl"
          >
            <MaskText lines={["Shop the drop"]} />
          </h2>
        </div>
        <Reveal delay={0.1}>
          <Link
            href="/shop"
            data-testid="view-all-objects-link"
            className="link-line text-xs uppercase tracking-[0.3em] text-steel hover:text-bone"
          >
            View all objects →
          </Link>
        </Reveal>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product, i) => (
          <Reveal key={product.id} delay={i * 0.06}>
            <ProductCard product={product} index={i} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
