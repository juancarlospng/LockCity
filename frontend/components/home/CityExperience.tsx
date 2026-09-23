"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import dynamic from "next/dynamic";
import { useRef } from "react";
import { interact3D } from "@/lib/analytics";

const HeroScene = dynamic(
  () => import("@/components/three/HeroScene").then((module) => module.HeroScene),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 h-full w-full bg-[radial-gradient(ellipse_at_50%_35%,#181818_0%,#050505_65%)]" />
    ),
  },
);

export function CityExperience() {
  const sectionRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const labelY = useTransform(scrollYProgress, [0, 0.12, 0.72], ["0%", "0%", "-6%"]);
  const labelOpacity = useTransform(scrollYProgress, [0, 0.12, 0.58, 0.72], [1, 1, 0.75, 0]);

  return (
    <section
      ref={sectionRef}
      data-testid="city-experience-section"
      aria-labelledby="city-experience-heading"
      className="relative h-[190svh] border-b border-graphite border-t border-graphite motion-reduce:h-[110svh] md:h-[260svh] md:motion-reduce:h-[115svh]"
      onPointerDown={() => interact3D("hero-city", "pointer")}
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden bg-bg">
        <HeroScene progress={scrollYProgress} />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-[linear-gradient(to_top,#050505,transparent)]"
        />
        <motion.div
          style={reducedMotion ? undefined : { y: labelY, opacity: labelOpacity }}
          className="pointer-events-none relative z-10 flex h-full flex-col justify-between px-4 pb-7 pt-24 sm:px-8 sm:pb-9 lg:px-12 lg:pb-10 lg:pt-28"
        >
          <div className="flex items-center justify-between gap-6 text-[9px] uppercase tracking-[0.26em] text-steel sm:text-[10px] sm:tracking-[0.3em]">
            <span className="flex items-center gap-2">
              <span aria-hidden className="h-1 w-1 animate-pulse-dot rounded-full bg-bone" />
              02 — Enter the city
            </span>
            <span className="hidden sm:block">Lock City / City system</span>
          </div>

          <div>
            <h2
              id="city-experience-heading"
              className="font-display text-[18vw] uppercase leading-[0.78] tracking-tight text-bone sm:text-[14vw] lg:text-[clamp(8rem,11vw,20rem)]"
            >
              Lock City<sup className="align-top text-[0.2em] text-steel">®</sup>
            </h2>
            <p className="mt-5 max-w-sm text-[11px] leading-relaxed text-steel sm:mt-6 sm:text-xs">
              A streetwear system rendered as a place. Collections are districts. Products are objects.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
