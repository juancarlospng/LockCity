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
    offset: ["start start", "end start"],
  });
  const labelY = useTransform(scrollYProgress, [0, 1], ["8%", "-12%"]);
  const labelOpacity = useTransform(scrollYProgress, [0, 0.18, 0.82, 1], [0.25, 1, 1, 0.25]);

  return (
    <section
      ref={sectionRef}
      data-testid="city-experience-section"
      aria-labelledby="city-experience-heading"
      className="relative h-[100svh] min-h-[620px] overflow-hidden border-b border-graphite border-t border-graphite"
      onPointerDown={() => interact3D("hero-city", "pointer")}
    >
      <HeroScene progress={scrollYProgress} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-[linear-gradient(to_top,#050505,transparent)]"
      />
      <motion.div
        style={reducedMotion ? undefined : { y: labelY, opacity: labelOpacity }}
        className="pointer-events-none relative z-10 flex h-full flex-col justify-between px-4 pb-10 pt-24 sm:px-8 lg:px-12 lg:pb-12 lg:pt-28"
      >
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-steel">
          <span className="flex items-center gap-2">
            <span aria-hidden className="h-1 w-1 animate-pulse-dot rounded-full bg-bone" />
            The city is alive
          </span>
          <span>Lock City / City system</span>
        </div>

        <div>
          <h2
            id="city-experience-heading"
            className="font-display text-[19vw] uppercase leading-[0.82] tracking-tight text-bone sm:text-[15vw] lg:text-[11vw]"
          >
            Lock City<sup className="align-top text-[0.2em] text-steel">®</sup>
          </h2>
          <p className="mt-6 max-w-sm text-xs leading-relaxed text-steel">
            A streetwear system rendered as a place. Collections are districts. Products are objects.
          </p>
        </div>
      </motion.div>
    </section>
  );
}
