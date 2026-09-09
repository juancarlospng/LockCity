import Link from "@/components/StoreLink";
import { Media } from "@/components/Media";
import { MaskText, Reveal } from "@/components/Reveal";
import { DISTRICTS } from "@/lib/districts";

export default function CityPage() {
  return (
    <div
      data-testid="city-page"
      className="px-4 pb-24 pt-32 sm:px-8 lg:px-12 lg:pt-40"
    >
      <p className="text-[12px] uppercase tracking-[0.3em] text-steel">
        Manifesto
      </p>
      <h1 className="mt-4 font-display text-6xl uppercase leading-[0.85] text-bone sm:text-8xl lg:text-9xl">
        <MaskText lines={["The City", "Is Alive"]} />
      </h1>

      <div className="mt-16 grid grid-cols-1 gap-10 lg:grid-cols-12">
        <Reveal className="lg:col-span-5">
          <div className="border-l border-graphite pl-6">
            {[
              "Locked in with your purpose.",
              "Locked in with your craft.",
              "Locked in with your people.",
              "Locked in with your city.",
            ].map((line, i) => (
              <p
                key={line}
                data-testid={`city-manifesto-${i + 1}`}
                className="py-3 font-display text-2xl uppercase text-bone sm:text-3xl"
              >
                {line}
              </p>
            ))}
          </div>
          <div className="mt-12 space-y-0">
            {DISTRICTS.map((d) => (
              <Link
                key={d.slug}
                href={`/collections/${d.slug}`}
                data-testid={`city-district-${d.slug}-link`}
                className="group flex items-baseline justify-between border-t border-graphite py-5 last:border-b"
              >
                <span className="flex items-baseline gap-5">
                  <span className="text-[12px] tracking-[0.3em] text-steel">
                    {d.index}
                  </span>
                  <span className="font-display text-3xl uppercase text-bone transition-transform duration-300 group-hover:translate-x-2">
                    {d.name}
                  </span>
                </span>
                <span className="text-[12px] uppercase tracking-[0.25em] text-steel">
                  Enter →
                </span>
              </Link>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.1} className="lg:col-span-7">
          <Media
            seed={1204}
            code="CITY"
            ratio="portrait"
            label="The city"
            className="min-h-[420px]"
          />
        </Reveal>
      </div>
    </div>
  );
}
