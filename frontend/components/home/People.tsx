import { EmptyState } from "@/components/EmptyState";
import { MaskText, Reveal } from "@/components/Reveal";

export function People() {
  return (
    <section
      data-testid="people-section"
      aria-labelledby="people-heading"
      className="border-t border-graphite px-4 py-24 sm:px-8 lg:px-12 lg:py-36"
    >
      <Reveal>
        <p className="text-[10px] uppercase tracking-[0.3em] text-steel">
          Scene 07 — Community
        </p>
      </Reveal>
      <h2
        id="people-heading"
        className="mt-6 font-display text-5xl uppercase leading-[0.9] text-bone sm:text-7xl"
      >
        <MaskText lines={["People", "Of the city"]} />
      </h2>

      <Reveal delay={0.1} className="mt-14">
        <EmptyState
          testid="people-empty-state"
          kicker="Artists · Athletes · Musicians · Creators · Promoters"
          title="Profiles coming soon"
          body="The people who move the city will be introduced here. No one is announced before their time."
        />
      </Reveal>
    </section>
  );
}
