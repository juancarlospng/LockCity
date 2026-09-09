import Link from "@/components/StoreLink";
import { EmptyState } from "@/components/EmptyState";
import { EMPTY_COPY } from "@/lib/content";
export function ArchiveTeaser() {
  return (
    <section
      className="section-space border-t border-graphite"
      aria-labelledby="archive-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h2 id="archive-heading" className="section-title">
          The archive
        </h2>
        <Link href="/archive" className="lc-button">
          Explore archive →
        </Link>
      </div>
      <div className="mt-10">
        <EmptyState
          kicker="Past seasons"
          {...EMPTY_COPY.archive}
          testid="archive-empty-state"
        />
      </div>
    </section>
  );
}
