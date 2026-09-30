import Link from "next/link";
import { mainProductImage } from "@/lib/product-media";
import type { Product } from "@/lib/types";

export function Aw26Hero({ product }: { product?: Product }) {
  const image = product ? mainProductImage(product) : undefined;
  return (
    <section data-testid="aw26-hero" className="relative min-h-[100svh] overflow-hidden bg-bg">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" />
      ) : null}
      <div className="relative flex min-h-[100svh] flex-col justify-end px-4 pb-16 sm:px-8 lg:px-12 lg:pb-20">
        <p className="text-[10px] uppercase tracking-[0.35em] text-steel">Lock City / Autumn Winter 2026</p>
        <h1 className="mt-4 font-display text-[28vw] uppercase leading-[0.72] text-bone sm:text-[22vw] lg:text-[18vw]">
          AW26
        </h1>
        <Link href="/collections/drop" className="link-line mt-8 w-fit text-xs uppercase tracking-[0.3em] text-bone">
          Enter the drop →
        </Link>
      </div>
    </section>
  );
}
