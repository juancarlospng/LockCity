import Image from "next/image";
import { MaskText, Reveal } from "@/components/Reveal";
import { mainProductImage } from "@/lib/product-media";
import type { Product } from "@/lib/types";

export function BrandEditorial({ products }: { products: Product[] }) {
  const visuals = products
    .map((product) => ({ product, image: mainProductImage(product) }))
    .filter((item): item is { product: Product; image: string } => Boolean(item.image))
    .slice(0, 2);

  return (
    <section
      data-testid="brand-editorial-section"
      aria-labelledby="brand-editorial-heading"
      className="border-t border-graphite px-4 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-32"
    >
      <div className="mx-auto grid max-w-[1800px] gap-12 lg:grid-cols-12 lg:items-center lg:gap-8">
        <div className="lg:col-span-5 lg:pr-10">
          <Reveal>
            <p className="text-[10px] uppercase tracking-[0.3em] text-steel">04 — The City</p>
          </Reveal>
          <h2
            id="brand-editorial-heading"
            className="mt-5 font-display text-6xl uppercase leading-[0.86] text-bone sm:text-8xl lg:text-9xl"
          >
            <MaskText lines={["The lock", "is the sign."]} />
          </h2>
          <p className="mt-8 max-w-md text-sm leading-7 text-steel sm:text-base">
            A symbol of identity, access and belonging.<br />
            Lock City is built through the pieces that carry it.
          </p>
        </div>

        {visuals.length > 0 ? (
          <div className="grid grid-cols-12 gap-3 sm:gap-5 lg:col-span-7">
            {visuals.map(({ product, image }, index) => (
              <figure
                key={product.id}
                className={`relative overflow-hidden border border-graphite bg-white ${
                  index === 0
                    ? "col-span-9 aspect-[4/5]"
                    : "col-span-7 col-start-6 -mt-16 aspect-[4/5] sm:-mt-28"
                }`}
              >
                <Image
                  src={image}
                  alt={`${product.name} product detail`}
                  fill
                  sizes="(max-width: 1023px) 75vw, 42vw"
                  className="object-contain p-4 sm:p-7 lg:p-9"
                />
                <figcaption className="absolute inset-x-0 bottom-0 border-t border-black/10 bg-white/90 px-3 py-2 text-[8px] uppercase tracking-[0.2em] text-black/60">
                  {String(index + 1).padStart(2, "0")} / {product.name}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
