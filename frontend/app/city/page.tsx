import Link from "next/link";
import { Media } from "@/components/Media";
import { MaskText, Reveal } from "@/components/Reveal";
import { MOCK_COLLECTIONS } from "@/lib/mock-data";

export default function CityPage() {
  return (
    <div
      data-testid="city-page"
      className="px-4 pb-24 pt-32 sm:px-8 lg:px-12 lg:pt-40"
    >
      <p className="text-[10px] uppercase tracking-[0.3em] text-steel">
        Manifesto — Content pending
      </p>
      <h1 className="mt-4 font-display text-6xl uppercase leading-[0.85] text-bone sm:text-8xl lg:text-9xl">
        <MaskText lines={["The City", "Is Alive"]} />
      </h1>

      <div className="mt-16 grid grid-cols-1 gap-10 lg:grid-cols-12">
        <Reveal className="lg:col-span-5">
          <p className="border-l border-graphite pl-6 text-sm leading-relaxed text-steel">
            [CONTENT PENDING] — Lock City brand story, culture and community copy will
            live here. This page demonstrates the editorial structure: large
            typography, asymmetrical media, and district navigation.
          </p>
          <div className="mt-12 space-y-0">
            {MOCK_COLLECTIONS.map((c) => (
              <Link
                key={c.slug}
                href={`/collections/${c.slug}`}
                data-testid={`city-district-${c.slug}-link`}
                className="group flex items-baseline justify-between border-t border-graphite py-5 last:border-b"
              >
                <span className="flex items-baseline gap-5">
                  <span className="text-[10px] tracking-[0.3em] text-steel">
                    {c.districtIndex}
                  </span>
                  <span className="font-display text-3xl uppercase text-bone transition-transform duration-300 group-hover:translate-x-2">
                    {c.name}
                  </span>
                </span>
                <span className="text-[9px] uppercase tracking-[0.25em] text-steel">
                  {c.tagline}
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
            label="LOCK CITY IMAGE PENDING"
            className="min-h-[420px]"
          />
        </Reveal>
      </div>
    </div>
  );
}
