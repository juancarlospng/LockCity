import Link from "./StoreLink";
import { ProductImage } from "./ProductImage";
import type { Person, Transmission, ArchiveEntry, Drop } from "@/lib/types";
function Card({
  href,
  title,
  image,
  meta,
}: {
  href: string;
  title: string;
  image?: string;
  meta?: string;
}) {
  return (
    <article className="border border-graphite">
      <Link href={href} className="block">
        <ProductImage src={image} alt={title} />
        <div className="space-y-3 p-5">
          <h2 className="font-display text-2xl uppercase">{title}</h2>
          {meta && <p className="text-sm text-steel">{meta}</p>}
          <span className="text-sm">Explore →</span>
        </div>
      </Link>
    </article>
  );
}
export function PersonCard({ person }: { person: Person }) {
  return (
    <Card
      href={`/people/${person.slug}`}
      title={person.name}
      image={person.images[0]}
      meta={[person.craft, person.city].filter(Boolean).join(" / ")}
    />
  );
}
export function TransmissionCard({
  transmission: t,
}: {
  transmission: Transmission;
}) {
  return (
    <Card
      href={`/transmissions/${t.slug}`}
      title={t.title}
      image={t.image}
      meta={t.category}
    />
  );
}
export function ArchiveCard({ entry }: { entry: ArchiveEntry }) {
  return (
    <article className="border border-graphite p-5">
      <ProductImage src={entry.images[0]} alt={entry.title} />
      <h2 className="mt-5 font-display text-2xl uppercase">{entry.title}</h2>
      {entry.year && <p>{entry.year}</p>}
      {entry.story && <p className="mt-4 text-steel">{entry.story}</p>}
    </article>
  );
}
export function DropCard({ drop }: { drop: Drop }) {
  return (
    <Card
      href={`/drops/${drop.slug}`}
      title={drop.name}
      image={drop.image}
      meta={drop.teaser}
    />
  );
}
