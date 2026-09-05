import { Media } from "@/components/Media";
import { MaskText, Reveal } from "@/components/Reveal";
import { MOCK_TRANSMISSIONS } from "@/lib/mock-data";

export default function JournalPage() {
  return (
    <div
      data-testid="journal-page"
      className="px-4 pb-24 pt-32 sm:px-8 lg:px-12 lg:pt-40"
    >
      <p className="text-[10px] uppercase tracking-[0.3em] text-steel">
        Editorial frequency — Mock content
      </p>
      <h1 className="mt-4 font-display text-6xl uppercase leading-[0.85] text-bone sm:text-8xl lg:text-9xl">
        <MaskText lines={["Transmissions"]} />
      </h1>

      <div className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {MOCK_TRANSMISSIONS.map((t, i) => (
          <Reveal key={t.id} delay={i * 0.08}>
            <article
              data-testid={`journal-card-${t.id}`}
              className="group flex h-full flex-col border border-graphite bg-card transition-colors duration-300 hover:border-bone"
            >
              <div className="overflow-hidden">
                <div className="transition-transform duration-700 group-hover:scale-[1.03]">
                  <Media seed={t.seed} code={t.code} label="EDITORIAL IMAGE PENDING" />
                </div>
              </div>
              <div className="flex flex-1 flex-col border-t border-graphite p-6">
                <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.25em] text-steel">
                  <span>{t.category}</span>
                  <span>{t.minutes} min read</span>
                </div>
                <h2 className="mt-3 font-display text-2xl uppercase leading-none text-bone">
                  {t.title}
                </h2>
                <p className="mt-3 text-xs leading-relaxed text-steel">{t.excerpt}</p>
                <p className="mt-auto pt-6 text-[10px] uppercase tracking-[0.25em] text-steel">
                  Full story — [Content pending]
                </p>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
