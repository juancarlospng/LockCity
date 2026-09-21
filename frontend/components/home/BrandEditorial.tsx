import { MaskText, Reveal } from "@/components/Reveal";

const LINES = [
  "Locked in with your purpose",
  "Locked in with your craft",
  "Locked in with your people",
  "Locked in with your city",
];

export function BrandEditorial() {
  return (
    <section
      data-testid="brand-editorial-section"
      aria-labelledby="brand-editorial-heading"
      className="border-t border-graphite px-4 py-24 sm:px-8 lg:px-12 lg:py-36"
    >
      <Reveal>
        <p className="text-[10px] uppercase tracking-[0.3em] text-steel">04 — Lock City</p>
      </Reveal>
      <h2
        id="brand-editorial-heading"
        className="mt-6 font-display text-6xl uppercase leading-[0.9] text-bone sm:text-8xl"
      >
        <MaskText lines={["Locked", "In"]} />
      </h2>
      <div className="mt-14 max-w-4xl border-b border-graphite">
        {LINES.map((line, index) => (
          <Reveal key={line} delay={index * 0.06}>
            <p className="border-t border-graphite py-6 font-display text-2xl uppercase text-bone sm:text-4xl">
              <span className="mr-6 align-middle font-mono text-[10px] tracking-[0.3em] text-steel">
                {String(index + 1).padStart(2, "0")}
              </span>
              {line}
            </p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
