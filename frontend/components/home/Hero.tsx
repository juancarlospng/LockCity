"use client";
import dynamic from "next/dynamic";
import { useRef } from "react";
import { useScroll } from "framer-motion";
import Link from "@/components/StoreLink";
import { SceneGate } from "@/components/three/SceneGate";
const HeroScene = dynamic(
  () => import("@/components/three/HeroScene").then((m) => m.HeroScene),
  { ssr: false },
);
export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  return (
    <section
      ref={ref}
      data-testid="hero-section"
      aria-label="The city"
      className="hero-shell relative overflow-hidden"
    >
      <SceneGate className="absolute inset-0" priority>
        <HeroScene progress={scrollYProgress} />
      </SceneGate>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg via-transparent to-bg/30"
      />
      <div className="relative z-10 flex h-full flex-col justify-between px-4 pb-8 pt-28 sm:px-8 lg:px-12">
        <p className="eyebrow text-bone">
          Lock City Clothes / Clothing & streetwear
        </p>
        <div>
          <h1 className="hero-title font-display uppercase">
            The city
            <br />
            is alive
          </h1>
          <p className="mt-7 max-w-md text-base text-bone">
            Built for those who move with purpose.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/shop"
              className="lc-button filled"
              data-testid="hero-shop-link"
            >
              Shop Lock City →
            </Link>
            <Link href="/city" className="lc-button">
              Explore the city →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
