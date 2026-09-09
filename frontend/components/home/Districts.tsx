"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MaskText, Reveal } from "@/components/Reveal";
import { DISTRICTS } from "@/lib/districts";
import { SceneGate } from "@/components/three/SceneGate";
import Link, { preserveQuery } from "@/components/StoreLink";

const DistrictScene = dynamic(
  () => import("@/components/three/DistrictScene").then((m) => m.DistrictScene),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 h-full w-full bg-[radial-gradient(ellipse_at_50%_60%,#141414_0%,#050505_70%)]" />
    ),
  },
);

export function Districts() {
  const [active, setActive] = useState<number | null>(null);
  const router = useRouter();

  const select = (i: number) => {
    router.push(
      preserveQuery(
        `/collections/${DISTRICTS[i].slug}`,
        window.location.search,
      ),
    );
  };

  return (
    <section
      data-testid="districts-section"
      aria-labelledby="districts-heading"
      className="relative border-t border-graphite"
    >
      <div className="pointer-events-none absolute left-4 top-10 z-10 sm:left-8 lg:left-12">
        <Reveal>
          <p className="text-[12px] uppercase tracking-[0.3em] text-steel">
            The districts
          </p>
        </Reveal>
        <h2
          id="districts-heading"
          className="mt-6 font-display text-5xl uppercase leading-[0.9] text-bone sm:text-7xl"
        >
          <MaskText lines={["Districts"]} />
        </h2>
      </div>

      <div className="relative h-[62vh] min-h-[440px] lg:h-[78vh]">
        <SceneGate className="absolute inset-0">
          <DistrictScene
            active={active}
            onHover={(i) => {
              setActive(i);
            }}
            onSelect={select}
          />
        </SceneGate>

        <div className="absolute right-4 top-10 hidden max-w-[240px] text-right sm:right-8 lg:block lg:right-12">
          {active !== null ? (
            <div data-testid="district-info-panel" className="animate-fade-in">
              <p className="text-[12px] tracking-[0.3em] text-steel">
                District {DISTRICTS[active].index}
              </p>
              <p className="mt-2 font-display text-2xl uppercase text-bone">
                {DISTRICTS[active].name}
              </p>
              <p className="mt-4 text-xs leading-relaxed text-steel">
                {DISTRICTS[active].description}
              </p>
            </div>
          ) : (
            <p className="text-[12px] uppercase tracking-[0.25em] text-steel">
              Hover or focus a district to inspect it
            </p>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 grid grid-cols-2 border-t border-graphite bg-bg/70 backdrop-blur-md lg:grid-cols-4">
          {DISTRICTS.map((d, i) => (
            <Link
              key={d.slug}
              href={`/collections/${d.slug}`}
              data-testid={`district-${d.slug}-button`}
              data-cursor="explore"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              aria-label={`Enter district ${d.index} — ${d.name}`}
              className={`group border-graphite px-4 py-6 text-left transition-colors duration-300 lg:px-8 lg:py-8 [&:not(:last-child)]:border-r ${
                active === i ? "bg-bone text-bg" : "text-bone hover:bg-onyx"
              }`}
            >
              <span
                className={`text-[12px] tracking-[0.3em] ${
                  active === i ? "text-bg/60" : "text-steel"
                }`}
              >
                District {d.index}
              </span>
              <span className="mt-2 block font-display text-2xl uppercase leading-none lg:text-3xl">
                {d.name}
              </span>
              <span
                className={`mt-2 block text-[12px] uppercase tracking-[0.2em] transition-transform duration-300 group-hover:translate-x-1 ${
                  active === i ? "text-bg/70" : "text-steel"
                }`}
              >
                Enter →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
