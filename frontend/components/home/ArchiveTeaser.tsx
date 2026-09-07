import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { MaskText, Reveal } from "@/components/Reveal";

export function ArchiveTeaser() {
  return (
    <section
      data-testid="archive-teaser-section"
      aria-labelledby="archive-heading"
      className="border-t border-graphite px-4 py-24 sm:px-8 lg:px-12 lg:py-36"
    >
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Reveal>
            <p className="text-[10px] uppercase tracking-[0.3em] text-steel">
              Scene 08 — The vault
            </p>
          </Reveal>
          <h2
            id="archive-heading"
            className="mt-6 font-display text-5xl uppercase leading-[0.9] text-bone sm:text-7xl"
          >
            <MaskText lines={["Lock City", "Archive"]} />
          </h2>
        </div>
        <Reveal delay={0.1}>
          <Link
            href="/archive"
            data-testid="enter-archive-link"
            className="link-line text-xs uppercase tracking-[0.3em] text-steel hover:text-bone"
          >
            Enter archive →
          </Link>
        </Reveal>
      </div>

      <Reveal delay={0.15} className="mt-14">
        <EmptyState
          testid="archive-empty-state"
          kicker="The vault"
          title="History starts here"
          body="Every drop will be preserved in the archive — never deleted. The first entry is written by the first drop."
        />
      </Reveal>
    </section>
  );
}
