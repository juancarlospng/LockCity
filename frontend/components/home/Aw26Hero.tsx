import Image from "next/image";
import Link from "next/link";
import { mainProductImage } from "@/lib/product-media";
import type { Product } from "@/lib/types";

export function Aw26Hero({ product }: { product?: Product }) {
  const image = product ? mainProductImage(product) : undefined;
  return (
    <section data-testid="aw26-hero" className="relative min-h-[100svh] overflow-hidden bg-bg">
      {image ? (
        <div className="absolute inset-y-14 right-[-8%] w-[112%] [mask-image:radial-gradient(ellipse_72%_88%_at_58%_48%,black_52%,transparent_84%)] sm:inset-y-8 sm:right-[-4%] sm:w-[104%] lg:inset-y-0 lg:right-[-2%] lg:w-[72%]">
          <Image
            src={image}
            alt="AW26 campaign garment"
            fill
            priority
            fetchPriority="high"
            quality={88}
            sizes="(max-width: 1023px) 100vw, 70vw"
            className="object-contain object-[center_18%] opacity-90 contrast-[1.1] saturate-[0.88] drop-shadow-[0_30px_60px_rgba(0,0,0,0.7)] lg:object-center"
          />
        </div>
      ) : null}
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,#050505_0%,rgba(5,5,5,0.86)_32%,rgba(5,5,5,0.18)_72%,#050505_100%)]" />
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(0deg,#050505_0%,transparent_42%,rgba(5,5,5,0.35)_100%)]" />
      <div className="relative flex min-h-[100svh] flex-col justify-end px-4 pb-12 sm:px-8 sm:pb-16 lg:px-12 lg:pb-20">
        <p className="text-[10px] uppercase tracking-[0.35em] text-steel">Lock City / Autumn Winter 2026</p>
        <h1 className="mt-10 font-display text-[28vw] uppercase leading-[0.72] text-bone sm:mt-12 sm:text-[22vw] lg:mt-14 lg:text-[18vw]">
          AW26
        </h1>
        <Link href="/collections/drop" className="link-line mt-12 inline-flex min-h-12 w-fit items-center border-y border-graphite px-1 text-xs uppercase tracking-[0.3em] text-bone transition-colors hover:border-steel sm:mt-14">
          Enter the drop →
        </Link>
      </div>
    </section>
  );
}
