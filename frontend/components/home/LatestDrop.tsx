import Link from "@/components/StoreLink";
import { Media } from "@/components/Media";
import { content, EMPTY_COPY } from "@/lib/content";
export async function LatestDrop() {
  const drops = await content.getDrops();
  const next = drops.find((d) => d.status === "COMING_SOON");
  return (
    <section
      id="scene-drop"
      className="section-space border-t border-graphite"
      aria-labelledby="next-drop-title"
    >
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <p className="eyebrow text-steel">The next chapter</p>
          <h2 id="next-drop-title" className="section-title">
            Next drop
          </h2>
          <p className="mt-6 text-sm uppercase tracking-widest">Coming soon</p>
          <p className="mt-6 max-w-md text-steel">
            {next?.teaser || EMPTY_COPY.drops.body}
          </p>
          {next?.releasedAt && (
            <time dateTime={next.releasedAt} className="mt-6 block">
              {next.releasedAt}
            </time>
          )}
          <Link
            href={next ? `/drops/${next.slug}` : "/drops"}
            className="lc-button mt-8"
          >
            Explore drops →
          </Link>
        </div>
        <Media
          seed={101}
          code="LC"
          ratio="wide"
          label="Lock City architectural study"
        />
      </div>
    </section>
  );
}
