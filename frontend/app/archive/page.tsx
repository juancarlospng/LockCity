import { EmptyState } from "@/components/EmptyState";
import { MaskText } from "@/components/Reveal";

export default function ArchivePage() {
  return (
    <div
      data-testid="archive-page"
      className="px-4 pb-24 pt-32 sm:px-8 lg:px-12 lg:pt-40"
    >
      <p className="text-[10px] uppercase tracking-[0.3em] text-steel">
        District 04 — The vault
      </p>
      <h1 className="mt-4 font-display text-6xl uppercase leading-[0.85] text-bone sm:text-8xl lg:text-9xl">
        <MaskText lines={["Archive"]} />
      </h1>
      <div className="mt-16">
        <EmptyState
          testid="archive-empty-state"
          kicker="The vault"
          title="History starts here"
          body="Lock City does not delete its past. Every drop — products, campaign, films, people — will be preserved here. The first entry is written by the first drop."
          ctaHref="/#join"
          ctaLabel="Join the city →"
        />
      </div>
    </div>
  );
}
