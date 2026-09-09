import Link from "@/components/StoreLink";
import { content, EMPTY_COPY } from "@/lib/content";
import { EmptyState } from "@/components/EmptyState";
import { TransmissionCard } from "@/components/ContentCards";
export async function Transmissions() {
  const records = await content.getTransmissions();
  return (
    <section
      className="section-space border-t border-graphite"
      aria-labelledby="transmissions-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h2 id="transmissions-heading" className="section-title">
          Transmissions
        </h2>
        <Link href="/transmissions" className="lc-button">
          All transmissions →
        </Link>
      </div>
      <div className="mt-10">
        {records.length ? (
          <div className="product-grid">
            {records.map((transmission) => (
              <TransmissionCard
                key={transmission.id}
                transmission={transmission}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            kicker="Editorial / Film / Collab / City / People"
            {...EMPTY_COPY.transmissions}
            testid="transmissions-empty-state"
          />
        )}
      </div>
    </section>
  );
}
