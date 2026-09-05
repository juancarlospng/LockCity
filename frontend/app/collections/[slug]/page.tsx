import { notFound } from "next/navigation";
import { Media } from "@/components/Media";
import { ProductCard } from "@/components/ProductCard";
import { MaskText, Reveal } from "@/components/Reveal";
import { commerce } from "@/lib/commerce";

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collection = await commerce.getCollectionBySlug(slug);
  if (!collection) notFound();
  const products = await commerce.getProductsByCollection(slug);

  return (
    <div
      data-testid={`collection-page-${collection.slug}`}
      className="px-4 pb-24 pt-32 sm:px-8 lg:px-12 lg:pt-40"
    >
      <p className="text-[10px] uppercase tracking-[0.3em] text-steel">
        District {collection.districtIndex} — {collection.tagline}
      </p>
      <h1 className="mt-4 font-display text-6xl uppercase leading-[0.85] text-bone sm:text-8xl lg:text-[10rem]">
        <MaskText lines={[collection.name]} />
      </h1>

      <div className="mt-14 grid grid-cols-1 gap-10 lg:grid-cols-12">
        <Reveal className="lg:col-span-8">
          <Media
            seed={collection.seed * 31}
            code={`D${collection.districtIndex}`}
            ratio="wide"
            label="CAMPAIGN IMAGE PENDING"
            className="min-h-[280px] lg:min-h-[440px]"
          />
        </Reveal>
        <Reveal delay={0.1} className="flex flex-col justify-end lg:col-span-4">
          <p className="border-l border-graphite pl-6 text-xs leading-relaxed text-steel">
            {collection.description}
          </p>
          <p className="mt-6 border-l border-graphite pl-6 text-[10px] uppercase tracking-[0.25em] text-steel">
            {products.length} object{products.length === 1 ? "" : "s"} — Mock data
          </p>
        </Reveal>
      </div>

      <div className="mt-20 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} />
        ))}
      </div>

      {products.length === 0 && (
        <div className="mt-24 border border-graphite p-12 text-center">
          <p className="font-display text-4xl uppercase text-graphite">
            District under construction
          </p>
          <p className="mt-4 text-xs uppercase tracking-[0.25em] text-steel">
            Objects incoming — [Information pending]
          </p>
        </div>
      )}
    </div>
  );
}
