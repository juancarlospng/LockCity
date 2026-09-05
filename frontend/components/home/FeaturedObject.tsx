"use client";

import {
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "framer-motion";
import Link from "next/link";
import { useRef, useState } from "react";
import { ObjectScene } from "@/components/three/ObjectScene";
import { MOCK_PRODUCTS } from "@/lib/mock-data";

const STEPS = [
  { n: "01", title: "Silhouette", body: "Boxy. Architectural. Cropped at the hip." },
  { n: "02", title: "Graphic", body: "Tonal transmission print across the chest. [Image pending]" },
  { n: "03", title: "Material", body: "500GSM organic cotton [Information pending]" },
  { n: "04", title: "Technical", body: "Double-layer hood. Dropped shoulder. Mock data." },
  { n: "05", title: "Identity", body: "OBJECT_0041 / DROP_006 — Concrete" },
  { n: "06", title: "Acquire", body: "The object is available inside the city." },
];

const FEATURED = MOCK_PRODUCTS[0];

export function FeaturedObject() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setStep(Math.min(STEPS.length - 1, Math.floor(v * STEPS.length)));
  });

  return (
    <section
      ref={ref}
      data-testid="featured-object-section"
      aria-labelledby="featured-object-heading"
      className="relative border-t border-graphite"
      style={{ height: reduced ? "auto" : `${STEPS.length * 80}vh` }}
    >
      <div
        className={`${reduced ? "" : "sticky top-0"} flex h-screen min-h-[600px] flex-col overflow-hidden lg:flex-row`}
      >
        <div className="relative h-1/2 lg:h-full lg:w-3/5">
          <ObjectScene progress={scrollYProgress} />
          <p
            aria-hidden
            className="text-outline pointer-events-none absolute bottom-6 left-4 select-none font-display text-[13vw] uppercase leading-none opacity-60 lg:left-12 lg:text-[9vw]"
          >
            Built for the city
          </p>
        </div>

        <div className="relative flex h-1/2 flex-col justify-center border-t border-graphite px-4 sm:px-8 lg:h-full lg:w-2/5 lg:border-l lg:border-t-0 lg:px-12">
          <p className="text-[10px] uppercase tracking-[0.3em] text-steel">
            Scene 05 — Featured object
          </p>
          <h2
            id="featured-object-heading"
            className="mt-4 font-display text-4xl uppercase leading-none text-bone sm:text-5xl"
          >
            {FEATURED.code}
          </h2>

          <ol className="mt-10 space-y-4">
            {STEPS.map((s, i) => (
              <li
                key={s.n}
                data-testid={`object-step-${s.n}`}
                aria-current={step === i ? "step" : undefined}
                className={`flex gap-5 transition-opacity duration-500 ${
                  reduced ? "" : step === i ? "opacity-100" : "opacity-25"
                }`}
              >
                <span className="text-[10px] tracking-[0.3em] text-steel">{s.n}</span>
                <div>
                  <p className="font-display text-xl uppercase leading-none text-bone">
                    {s.title}
                  </p>
                  <p
                    className={`mt-1 max-w-[280px] text-xs leading-relaxed text-steel transition-[height,opacity] duration-500 ${
                      reduced || step === i ? "block" : "hidden lg:block lg:opacity-0 lg:h-0"
                    }`}
                  >
                    {s.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <Link
            href={`/product/${FEATURED.slug}`}
            data-testid="explore-object-button"
            data-cursor="view"
            className="mt-10 inline-flex w-fit border border-bone px-8 py-4 text-xs font-bold uppercase tracking-[0.3em] text-bone transition-colors duration-300 hover:bg-bone hover:text-bg"
          >
            Explore object →
          </Link>
        </div>
      </div>
    </section>
  );
}
