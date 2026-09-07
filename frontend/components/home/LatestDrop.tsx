"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { useRef } from "react";
import { Media } from "@/components/Media";
import { MaskText, Reveal } from "@/components/Reveal";

export function LatestDrop() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const mediaY = useTransform(scrollYProgress, [0, 1], ["-6%", "6%"]);

  return (
    <section
      ref={ref}
      id="scene-drop"
      data-testid="latest-drop-section"
      aria-labelledby="latest-drop-heading"
      className="relative overflow-hidden border-t border-graphite px-4 py-24 sm:px-8 lg:px-12 lg:py-36"
    >
      <p
        aria-hidden
        className="text-outline pointer-events-none absolute -right-6 top-10 select-none font-display text-[24vw] uppercase leading-none opacity-40"
      >
        001
      </p>

      <div className="relative grid grid-cols-1 gap-14 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Reveal>
            <p className="text-[10px] uppercase tracking-[0.3em] text-steel">
              Scene 02 — Transmission incoming
            </p>
          </Reveal>
          <h2
            id="latest-drop-heading"
            className="mt-6 font-display text-6xl uppercase leading-[0.9] text-bone sm:text-7xl lg:text-8xl"
          >
            <MaskText lines={["Latest", "Drop"]} />
          </h2>

          <Reveal delay={0.15} className="mt-10 space-y-4">
            <div className="flex items-center gap-4">
              <span className="font-display text-3xl uppercase text-bone">
                The first drop
              </span>
              <span
                data-testid="drop-status-badge"
                className="inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.3em] text-bone"
              >
                <span aria-hidden className="h-1 w-1 animate-pulse-dot rounded-full bg-bone" />
                Coming soon
              </span>
            </div>
            <p className="max-w-sm text-xs leading-relaxed text-steel">
              The city is being built. Join to get the signal the moment the
              first objects land.
            </p>
          </Reveal>

          <Reveal delay={0.25} className="mt-12 flex flex-wrap items-center gap-6">
            <Link
              href="/#join"
              data-testid="notify-drop-button"
              data-cursor="explore"
              className="border border-bone px-8 py-4 text-xs font-bold uppercase tracking-[0.3em] text-bone transition-colors duration-300 hover:bg-bone hover:text-bg"
            >
              Get the signal →
            </Link>
            <Link
              href="/shop"
              data-testid="drop-shop-link"
              className="link-line text-xs uppercase tracking-[0.3em] text-steel hover:text-bone"
            >
              Shop →
            </Link>
          </Reveal>
        </div>

        <div className="lg:col-span-7">
          <Reveal delay={0.1}>
            <div className="relative overflow-hidden" data-cursor="explore">
              <motion.div style={reduced ? undefined : { y: mediaY }} className="scale-110">
                <Media
                  seed={101}
                  code="001"
                  ratio="wide"
                  label="First drop campaign"
                  className="min-h-[320px] lg:min-h-[520px]"
                />
              </motion.div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
