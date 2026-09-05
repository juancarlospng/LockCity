import { Media } from "@/components/Media";
import { MaskText, Reveal } from "@/components/Reveal";

const CHAPTERS = [
  {
    n: "01",
    title: "Concrete Foundation",
    body: "[CONTENT PENDING] — Brand story placeholder. Culture, street, art, music, community.",
  },
  {
    n: "02",
    title: "Uncompromising Utility",
    body: "[CONTENT PENDING] — Design philosophy placeholder. Function before decoration.",
  },
  {
    n: "03",
    title: "Digital Perpetuity",
    body: "[CONTENT PENDING] — The city exists beyond clothing. A system, a community.",
  },
];

export function TheCity() {
  return (
    <section
      data-testid="the-city-section"
      aria-labelledby="the-city-heading"
      className="border-t border-graphite px-4 py-24 sm:px-8 lg:px-12 lg:py-36"
    >
      <div className="grid grid-cols-1 gap-14 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Reveal>
            <p className="text-[10px] uppercase tracking-[0.3em] text-steel">
              Scene 06 — Manifesto
            </p>
          </Reveal>
          <h2
            id="the-city-heading"
            className="mt-6 font-display text-6xl uppercase leading-[0.9] text-bone sm:text-8xl"
          >
            <MaskText lines={["The City"]} />
          </h2>
          <Reveal delay={0.15} className="mt-12">
            <Media
              seed={909}
              code="CITY"
              ratio="wide"
              label="LOCK CITY VIDEO PENDING"
              className="min-h-[300px]"
            />
          </Reveal>
        </div>

        <div className="flex flex-col justify-end lg:col-span-5">
          {CHAPTERS.map((c, i) => (
            <Reveal key={c.n} delay={i * 0.1}>
              <div
                data-testid={`manifesto-chapter-${c.n}`}
                className="border-t border-graphite py-8 first:border-t-0 lg:first:border-t"
              >
                <div className="flex items-baseline gap-6">
                  <span className="text-[10px] tracking-[0.3em] text-steel">{c.n}</span>
                  <h3 className="font-display text-2xl uppercase text-bone sm:text-3xl">
                    {c.title}
                  </h3>
                </div>
                <p className="mt-3 pl-12 text-xs leading-relaxed text-steel">{c.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
