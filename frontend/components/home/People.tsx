import Link from "@/components/StoreLink";
import { content, EMPTY_COPY } from "@/lib/content";
import { EmptyState } from "@/components/EmptyState";
import { PersonCard } from "@/components/ContentCards";
export async function People() {
  const records = await content.getPeople();
  return (
    <section
      className="section-space border-t border-graphite"
      aria-labelledby="people-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h2 id="people-heading" className="section-title">
          People of the city
        </h2>
        <Link href="/people" className="lc-button">
          Meet the city →
        </Link>
      </div>
      <div className="mt-10">
        {records.length ? (
          <div className="product-grid">
            {records.map((person) => (
              <PersonCard key={person.id} person={person} />
            ))}
          </div>
        ) : (
          <EmptyState
            kicker="People & purpose"
            {...EMPTY_COPY.people}
            testid="people-empty-state"
          />
        )}
      </div>
    </section>
  );
}
