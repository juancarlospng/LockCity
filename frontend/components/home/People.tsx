import { Media } from "@/components/Media";
import { MaskText, Reveal } from "@/components/Reveal";
import { MOCK_PEOPLE } from "@/lib/mock-data";

export function People() {
  return (
    <section
      data-testid="people-section"
      aria-labelledby="people-heading"
      className="overflow-hidden border-t border-graphite py-24 lg:py-36"
    >
      <div className="px-4 sm:px-8 lg:px-12">
        <Reveal>
          <p className="text-[10px] uppercase tracking-[0.3em] text-steel">
            Scene 07 — Community · Profiles pending
          </p>
        </Reveal>
        <h2
          id="people-heading"
          className="mt-6 font-display text-5xl uppercase leading-[0.9] text-bone sm:text-7xl"
        >
          <MaskText lines={["People", "Of the city"]} />
        </h2>
      </div>

      <div
        data-testid="people-scroller"
        data-cursor="drag"
        className="mt-14 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 sm:px-8 lg:px-12"
      >
        {MOCK_PEOPLE.map((person, i) => (
          <Reveal key={person.id} delay={i * 0.06} className="shrink-0">
            <article
              data-testid={`person-card-${person.id}`}
              className="group w-[70vw] shrink-0 snap-start border border-graphite bg-card transition-colors duration-300 hover:border-bone sm:w-[320px]"
            >
              <div className="overflow-hidden">
                <div className="transition-transform duration-700 group-hover:scale-[1.04]">
                  <Media seed={person.seed} code={person.ref} label="PROFILE IMAGE PENDING" />
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-graphite p-5">
                <div>
                  <p className="text-[9px] tracking-[0.3em] text-steel">{person.ref}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.15em] text-bone">
                    {person.role}
                  </p>
                </div>
                <span className="text-[9px] uppercase tracking-[0.25em] text-steel">
                  D{person.district}
                </span>
              </div>
            </article>
          </Reveal>
        ))}
        <div className="flex w-[40vw] shrink-0 items-center justify-center sm:w-[240px]">
          <p className="max-w-[160px] text-center text-[10px] uppercase tracking-[0.25em] text-steel">
            Artists · Ambassadors · Creators — [Information pending]
          </p>
        </div>
      </div>
    </section>
  );
}
