"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef } from "react";
import { MaskText } from "@/components/Reveal";
import { enterCity, interact3D, viewHome } from "@/lib/analytics";
import { useEffect } from "react";

const HeroScene = dynamic(
  () => import("@/components/three/HeroScene").then((m) => m.HeroScene),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 h-full w-full bg-[radial-gradient(ellipse_at_50%_35%,#181818_0%,#050505_65%)]" />
    ),
  }
);

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  useEffect(() => viewHome(), []);

  const scrollToDrop = () => {
    enterCity();
    const target = document.getElementById("scene-drop");
    const lenis = (
      window as Window & { __lenis?: { scrollTo: (t: HTMLElement, o?: object) => void } }
    ).__lenis;
    if (target && lenis && !reduced) lenis.scrollTo(target, { duration: 1.4 });
    else target?.scrollIntoView({ behavior: "auto" });
  };

  return (
    <section
      ref={ref}
      data-testid="hero-section"
      aria-label="Enter the city"
      className="relative h-[100svh] min-h-[620px] overflow-hidden"
      onPointerDown={() => interact3D("hero-city", "pointer")}
    >
      <HeroScene progress={scrollYProgress} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-[linear-gradient(to_top,#050505,transparent)]"
      />

      <motion.div
        style={reduced ? undefined : { y, opacity }}
        className="relative z-10 flex h-full flex-col justify-between px-4 pb-10 pt-24 sm:px-8 lg:px-12"
      >
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-steel">
          <span data-testid="hero-status-badge" className="flex items-center gap-2">
            <span aria-hidden className="h-1 w-1 animate-pulse-dot rounded-full bg-bone" />
            The city is alive
          </span>
          <span>Scene 01</span>
        </div>

        <div className="flex flex-col gap-8">
          <h1 className="font-display text-[22vw] uppercase leading-[0.82] tracking-tight text-bone sm:text-[17vw] lg:text-[13.5vw]">
            <MaskText
              delay={0.35}
              stagger={0.14}
              lines={[
                "Lock",
                <>
                  City<span className="align-top text-[0.25em] text-steel">®</span>
                </>,
              ]}
            />
          </h1>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <p className="max-w-xs text-xs leading-relaxed text-steel">
              A streetwear system rendered as a place. Collections are districts.
              Products are objects.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                data-testid="hero-enter-city-button"
                data-cursor="explore"
                onClick={scrollToDrop}
                className="border border-bone bg-bone px-8 py-4 text-xs font-bold uppercase tracking-[0.3em] text-bg transition-colors duration-300 hover:bg-transparent hover:text-bone"
              >
                Enter the city ↓
              </button>
              <Link
                href="/shop"
                data-testid="hero-shop-link"
                className="link-line px-1 py-4 text-xs uppercase tracking-[0.3em] text-bone"
              >
                Shop →
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
