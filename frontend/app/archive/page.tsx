import { MaskText, Reveal } from "@/components/Reveal";
import { commerce } from "@/lib/commerce";

export default async function ArchivePage() {
  const drops = await commerce.getDrops();

  return (
    <div
      data-testid="archive-page"
      className="px-4 pb-24 pt-32 sm:px-8 lg:px-12 lg:pt-40"
    >
      <p className="text-[10px] uppercase tracking-[0.3em] text-steel">
        District 04 — The vault · Mock data
      </p>
      <h1 className="mt-4 font-display text-6xl uppercase leading-[0.85] text-bone sm:text-8xl lg:text-9xl">
        <MaskText lines={["Archive"]} />
      </h1>
      <p className="mt-6 max-w-md text-xs leading-relaxed text-steel">
        Every drop, preserved. Archived objects are not for sale. Release history is
        placeholder content — [Information pending].
      </p>

      <div className="mt-16 border-t border-graphite">
        {drops.map((drop, i) => (
          <Reveal key={drop.id} delay={i * 0.05}>
            <div
              data-testid={`archive-row-${drop.code.toLowerCase()}`}
              className="group grid grid-cols-[auto_1fr_auto] items-center gap-6 border-b border-graphite py-8 transition-colors duration-300 hover:bg-onyx sm:grid-cols-[100px_1fr_1fr_auto]"
            >
              <span className="text-[10px] tracking-[0.3em] text-steel">
                {String(i + 1).padStart(3, "0")}
              </span>
              <div>
                <span className="font-display text-3xl uppercase text-bone transition-transform duration-300 group-hover:translate-x-2 sm:text-5xl">
                  {drop.code}
                </span>
                <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-steel">
                  {drop.name}
                </p>
              </div>
              <span className="hidden text-[10px] uppercase tracking-[0.25em] text-steel sm:block">
                {drop.season}
              </span>
              <span
                className={`border px-4 py-2 text-[9px] uppercase tracking-[0.25em] ${
                  drop.status === "AVAILABLE"
                    ? "border-bone text-bone"
                    : "border-graphite text-steel"
                }`}
              >
                {drop.status.replace("_", " ")}
              </span>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
