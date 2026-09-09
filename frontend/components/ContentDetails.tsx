import Link from "./StoreLink";
import { ProductImage } from "./ProductImage";
import { ProductGrid } from "./ShopGrid";
import type { Person, Product, Drop, Transmission } from "@/lib/types";
export function PersonDetail({
  person,
  products = [],
}: {
  person?: Person;
  products?: Product[];
}) {
  return (
    <div className="page-shell">
      <Link href="/people" className="eyebrow">
        ← People of the city
      </Link>
      <div className="mt-8 grid gap-12 lg:grid-cols-2">
        <ProductImage
          src={person?.images[0]}
          alt={person?.name || "Portrait unavailable"}
        />
        <div>
          <p className="eyebrow text-steel">
            {person?.craft || "People of the city"}
          </p>
          <h1 className="section-title">
            {person?.name || "This story is not available"}
          </h1>
          {person?.alias && <p>{person.alias}</p>}
          <p className="mt-6 text-steel">
            {person
              ? [person.city, person.country].filter(Boolean).join(", ")
              : "The first profiles are entering the city."}
          </p>
          <p className="mt-8">{person?.shortBio || person?.bio}</p>
          <p className="mt-8">{person?.story}</p>
          {(person?.lockedInStatement || person?.lockedInStory) && (
            <blockquote className="mt-8 border-l border-graphite pl-6">
              {person.lockedInStatement || person.lockedInStory}
            </blockquote>
          )}
          {person?.socials?.map((s) => (
            <a
              key={s.url}
              href={s.url}
              rel="noreferrer"
              className="lc-button mt-4"
            >
              {s.platform} ↗
            </a>
          ))}
        </div>
      </div>
      {person?.videos?.map((src) => (
        <video
          key={src}
          src={src}
          controls
          preload="none"
          className="mt-8 w-full"
        />
      ))}
      <section className="mt-16">
        <h2 className="section-title mb-8">Shop what they wear</h2>
        {products.length ? (
          <ProductGrid products={products} />
        ) : (
          <p className="text-steel">
            The clothing behind each story will appear here.
          </p>
        )}
      </section>
    </div>
  );
}
export function DropDetail({ drop }: { drop?: Drop }) {
  return (
    <div className="page-shell">
      <Link href="/drops" className="eyebrow">
        ← Drops
      </Link>
      <h1 className="page-title">{drop?.name || "Drop unavailable"}</h1>
      <p className="mt-6 text-steel">
        {drop?.teaser ||
          "Release details will be shared with the next chapter."}
      </p>
      {drop?.releasedAt && (
        <time className="mt-4 block" dateTime={drop.releasedAt}>
          {drop.releasedAt}
        </time>
      )}
      <div className="mt-12 max-w-3xl">
        <ProductImage
          src={drop?.image}
          alt={drop?.name || "Campaign image unavailable"}
        />
      </div>
      {drop?.story && <p className="mt-8">{drop.story}</p>}
      {!!drop?.products?.length && (
        <section className="mt-12">
          <h2 className="section-title mb-8">Shop the drop</h2>
          <ProductGrid products={drop.products} />
        </section>
      )}
    </div>
  );
}
export function TransmissionDetail({
  transmission: t,
}: {
  transmission?: Transmission;
}) {
  return (
    <article className="page-shell mx-auto max-w-5xl">
      <Link href="/transmissions" className="eyebrow">
        ← Transmissions
      </Link>
      <p className="eyebrow mt-10 text-steel">
        {t?.category || "Stories from the city"}
      </p>
      <h1 className="page-title">
        {t?.title || "This transmission is unavailable"}
      </h1>
      <p className="mt-6 text-steel">
        {t?.excerpt || "Stories, films and signals from the city."}
      </p>
      {t?.publishedAt && <time dateTime={t.publishedAt}>{t.publishedAt}</time>}
      <div className="mt-10">
        <ProductImage
          src={t?.image}
          alt={t?.title || "Editorial image unavailable"}
        />
      </div>
      {t?.body && (
        <p className="mt-10 whitespace-pre-line leading-loose">{t.body}</p>
      )}
      {t?.videos?.map((src) => (
        <video
          controls
          preload="none"
          src={src}
          key={src}
          className="mt-8 w-full"
        />
      ))}
    </article>
  );
}
