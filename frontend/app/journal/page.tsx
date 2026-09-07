import { EmptyState } from "@/components/EmptyState";
import { MaskText } from "@/components/Reveal";

export default function JournalPage() {
  return (
    <div
      data-testid="journal-page"
      className="px-4 pb-24 pt-32 sm:px-8 lg:px-12 lg:pt-40"
    >
      <p className="text-[10px] uppercase tracking-[0.3em] text-steel">
        Editorial frequency
      </p>
      <h1 className="mt-4 font-display text-6xl uppercase leading-[0.85] text-bone sm:text-8xl lg:text-9xl">
        <MaskText lines={["Transmissions"]} />
      </h1>
      <div className="mt-16">
        <EmptyState
          testid="journal-empty-state"
          kicker="Editorial · Film · Collab · City · People"
          title="First broadcast soon"
          body="LOCKED IN profiles, campaign films, drop stories and city stories will transmit from here. Nothing is published before it is real."
          ctaHref="/#join"
          ctaLabel="Join the city →"
        />
      </div>
    </div>
  );
}
