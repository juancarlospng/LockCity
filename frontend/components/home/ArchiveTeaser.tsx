import Link from "next/link";
import { MaskText, Reveal } from "@/components/Reveal";
import { MOCK_DROPS } from "@/lib/mock-data";

export function ArchiveTeaser() {
  const past = MOCK_DROPS.filter((d) => d.status !== "AVAILABLE");

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

      <div className="mt-14 border-t border-graphite">
        {past.map((drop, i) => (
          <Reveal key={drop.id} delay={i * 0.05}>
            <Link
              href="/archive"
              data-testid={`archive-item-${drop.code.toLowerCase()}`}
              className="group grid grid-cols-[auto_1fr_auto] items-center gap-6 border-b border-graphite py-6 transition-colors duration-300 hover:bg-onyx sm:grid-cols-[80px_1fr_1fr_auto]"
            >
              <span className="text-[10px] tracking-[0.3em] text-steel">
                {String(i + 1).padStart(3, "0")}
              </span>
              <span className="font-display text-2xl uppercase text-bone transition-transform duration-300 group-hover:translate-x-2 sm:text-4xl">
                {drop.code}
              </span>
              <span className="hidden text-[10px] uppercase tracking-[0.25em] text-steel sm:block">
                {drop.season} — Mock
              </span>
              <span
                className={`text-[10px] uppercase tracking-[0.25em] ${
                  drop.status === "SOLD_OUT" ? "text-steel line-through" : "text-bone"
                }`}
              >
                {drop.status.replace("_", " ")}
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
