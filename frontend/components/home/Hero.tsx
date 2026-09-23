"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { Media } from "@/components/Media";
import { viewHome } from "@/lib/analytics";
import { mainProductImage } from "@/lib/product-media";
import type { Product } from "@/lib/types";

export function Hero({ product }: { product?: Product }) {
  const image = product ? mainProductImage(product) : undefined;

  useEffect(() => viewHome(), []);

  return (
    <section
      data-testid="hero-section"
      aria-labelledby="hero-heading"
      className="relative min-h-[100svh] overflow-hidden border-b border-graphite bg-bg px-4 pb-8 pt-24 sm:px-8 sm:pb-10 lg:flex lg:max-h-[1080px] lg:min-h-[760px] lg:items-stretch lg:px-12 lg:pb-12 lg:pt-28"
    >
      <div className="mx-auto grid w-full max-w-[1800px] gap-8 lg:grid-cols-12 lg:gap-8">
        <div className="flex flex-col justify-between lg:col-span-5 lg:py-5 xl:col-span-4">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-steel lg:block">
            <p>Lock City®</p>
            <p className="lg:mt-3">01 — Core identity</p>
          </div>

          <div className="mt-10 lg:mt-20">
            <h1
              id="hero-heading"
              className="max-w-3xl font-display text-[17vw] uppercase leading-[0.82] tracking-[-0.025em] text-bone sm:text-[12vw] lg:text-[7vw] xl:text-[6.3vw] 2xl:text-[6rem]"
            >
              Built around the lock.
            </h1>
            <p className="mt-6 max-w-md text-sm leading-7 text-steel sm:text-base">
              Core pieces. Limited expressions. One city.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4 sm:mt-10">
              <Link
                href="/shop"
                data-testid="hero-shop-link"
                className="border border-bone bg-bone px-7 py-4 text-[10px] font-bold uppercase tracking-[0.28em] text-bg transition-colors hover:bg-transparent hover:text-bone"
              >
                Shop
              </Link>
              <Link
                href="/collections/core"
                data-testid="hero-core-link"
                className="link-line px-2 py-4 text-[10px] font-bold uppercase tracking-[0.28em] text-bone"
              >
                Explore core
              </Link>
            </div>
          </div>

          <p className="mt-8 hidden max-w-xs text-[9px] uppercase leading-5 tracking-[0.22em] text-steel lg:block">
            Permanent pieces / Current city uniform
          </p>
        </div>

        <div className="relative mt-2 min-h-[42svh] overflow-hidden border border-graphite bg-white lg:col-span-7 lg:mt-0 lg:min-h-0 xl:col-span-8">
          {image ? (
            <Image
              src={image}
              alt={`${product?.name ?? "Lock City Core product"} — front view`}
              fill
              priority
              sizes="(max-width: 1023px) 100vw, 66vw"
              className="object-contain p-5 sm:p-8 lg:p-12 xl:p-16"
            />
          ) : (
            <Media seed={3292} className="absolute inset-0 h-full w-full" />
          )}
          {product ? (
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 border-t border-black/10 bg-white/90 px-4 py-3 text-black backdrop-blur-sm sm:px-5">
              <p className="font-display text-lg uppercase leading-none sm:text-xl">{product.name}</p>
              <p className="text-[9px] uppercase tracking-[0.22em] text-black/60">Core</p>
            </div>
          ) : null}
          <div aria-hidden className="absolute right-4 top-4 text-[9px] uppercase tracking-[0.25em] text-black/50">
            LC / 01
          </div>
        </div>
      </div>
    </section>
  );
}
