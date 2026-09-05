import Link from "next/link";
import { Media } from "@/components/Media";
import { MaskText, Reveal } from "@/components/Reveal";
import { MOCK_TRANSMISSIONS } from "@/lib/mock-data";

export function Transmissions() {
  const [first, ...rest] = MOCK_TRANSMISSIONS;

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

      <div className="mt-14 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Reveal>
          <Link
            href="/journal"
            data-testid={`transmission-card-${first.id}`}
            data-cursor="view"
            className="group block border border-graphite bg-card transition-colors duration-300 hover:border-bone"
          >
            <div className="overflow-hidden">
              <div className="transition-transform duration-700 group-hover:scale-[1.03]">
                <Media seed={first.seed} code={first.code} ratio="wide" label="EDITORIAL IMAGE PENDING" />
              </div>
            </div>
            <div className="border-t border-graphite p-6">
              <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.25em] text-steel">
                <span>{first.category}</span>
                <span>{first.minutes} min</span>
              </div>
              <h3 className="mt-3 font-display text-3xl uppercase leading-none text-bone">
                {first.title}
              </h3>
              <p className="mt-3 max-w-md text-xs leading-relaxed text-steel">
                {first.excerpt}
              </p>
            </div>
          </Link>
        </Reveal>

        <div className="flex flex-col gap-5">
          {rest.map((t, i) => (
            <Reveal key={t.id} delay={0.1 + i * 0.08} className="flex-1">
              <Link
                href="/journal"
                data-testid={`transmission-card-${t.id}`}
                data-cursor="view"
                className="group flex h-full gap-6 border border-graphite bg-card p-6 transition-colors duration-300 hover:border-bone"
              >
                <span className="font-display text-4xl uppercase leading-none text-graphite transition-colors duration-300 group-hover:text-steel">
                  {t.code.replace("TRANSMISSION_", "T")}
                </span>
                <div className="flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-4 text-[9px] uppercase tracking-[0.25em] text-steel">
                      <span>{t.category}</span>
                      <span>{t.minutes} min</span>
                    </div>
                    <h3 className="mt-2 font-display text-2xl uppercase leading-none text-bone">
                      {t.title}
                    </h3>
                  </div>
                  <p className="mt-4 text-xs leading-relaxed text-steel">{t.excerpt}</p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
