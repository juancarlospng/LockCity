import { notFound } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { ProductCard } from "@/components/ProductCard";
import { MaskText } from "@/components/Reveal";
import { commerce } from "@/lib/commerce";
import { DISTRICTS } from "@/lib/districts";

export const dynamic = "force-dynamic";

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const district = DISTRICTS.find((d) => d.slug === slug);
  if (!district) notFound();
  const products = await commerce.getProductsByCollection(slug);

  return (
    <div
      data-testid={`collection-page-${district.slug}`}
      className="px-4 pb-24 pt-32 sm:px-8 lg:px-12 lg:pt-40"
    >
      <p className="text-[10px] uppercase tracking-[0.3em] text-steel">
        District {district.index}
      </p>
      <h1 className="mt-4 font-display text-6xl uppercase leading-[0.85] text-bone sm:text-8xl lg:text-[10rem]">
        <MaskText lines={[district.name]} />
      </h1>

      {products.length === 0 ? (
        <div className="mt-16">
          <EmptyState
            testid={`collection-empty-${district.slug}`}
            kicker={`District ${district.index} — ${district.name}`}
            title="This district opens soon"
            body="Objects land here with the drops. Join the city and the signal reaches you first."
            ctaHref="/#join"
            ctaLabel="Join the city →"
          />
        </div>
      ) : (
        <div className="mt-20 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
