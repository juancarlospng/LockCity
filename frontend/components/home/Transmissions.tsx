import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { MaskText, Reveal } from "@/components/Reveal";

export function Transmissions() {
  return (
    <section
      data-testid="transmissions-section"
      aria-labelledby="transmissions-heading"
      className="border-t border-graphite px-4 py-24 sm:px-8 lg:px-12 lg:py-36"
    >
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Reveal>
            <p className="text-[10px] uppercase tracking-[0.3em] text-steel">
              Scene 09 — Editorial frequency
            </p>
          </Reveal>
          <h2
            id="transmissions-heading"
            className="mt-6 font-display text-5xl uppercase leading-[0.9] text-bone sm:text-7xl"
          >
            <MaskText lines={["Transmissions"]} />
          </h2>
        </div>
        <Reveal delay={0.1}>
          <Link
            href="/journal"
            data-testid="all-transmissions-link"
            className="link-line text-xs uppercase tracking-[0.3em] text-steel hover:text-bone"
          >
            All transmissions →
          </Link>
        </Reveal>
      </div>

      <Reveal delay={0.15} className="mt-14">
        <EmptyState
          testid="transmissions-empty-state"
          kicker="Editorial · Film · Collab · City · People"
          title="First broadcast soon"
          body="LOCKED IN profiles, campaign films, drop stories and city stories will transmit from here."
        />
      </Reveal>
    </section>
  );
}
