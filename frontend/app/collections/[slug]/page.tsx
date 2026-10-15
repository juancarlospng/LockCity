import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ProductCard } from "@/components/ProductCard";
import { MaskText } from "@/components/Reveal";
import { CatalogError } from "@/components/CatalogError";
import { commerce } from "@/lib/commerce";
import { DISTRICTS } from "@/lib/districts";
import { activeDropProducts, coreProducts, DROP_VISIBLE } from "@/lib/merchandising";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

const getProducts = cache(() => commerce.getProducts());

async function getCollectionProducts(slug: string) {
  const products = await getProducts();
  if (slug === "core") return coreProducts(products);
  if (slug === "drop") return activeDropProducts(products);
  return [];
}

function description(slug: string) {
  if (slug === "core") {
    return "Permanent Lock City pieces built around the lock — the symbol at the center of the city.";
  }
  if (slug === "drop") return "The active Lock City drop.";
  return "This Lock City collection is not currently published.";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const district = DISTRICTS.find((entry) => entry.slug === slug);
  if (!district) {
    return pageMetadata({
      title: "Collection not found",
      description: "This Lock City collection does not exist.",
      path: `/collections/${encodeURIComponent(slug)}`,
      noIndex: true,
    });
  }
  try {
    const products = await getCollectionProducts(slug);
    return pageMetadata({
      title: district.name,
      description: description(slug),
      path: `/collections/${encodeURIComponent(slug)}`,
      noIndex: products.length === 0 || (slug === "drop" && !DROP_VISIBLE),
    });
  } catch {
    return pageMetadata({
      title: district.name,
      description: description(slug),
      path: `/collections/${encodeURIComponent(slug)}`,
      noIndex: true,
    });
  }
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const district = DISTRICTS.find((entry) => entry.slug === slug);
  if (!district) notFound();
  if (slug === "drop" && !DROP_VISIBLE) notFound();
  let products;
  try { products = await getCollectionProducts(slug); }
  catch (error) { return <CatalogError error={error} />; }

  return (
    <div
      data-testid={`collection-page-${district.slug}`}
      className="px-4 pb-24 pt-32 sm:px-8 lg:px-12 lg:pt-40"
    >
      <p className="text-[10px] uppercase tracking-[0.3em] text-steel">
        {slug === "core" ? "Permanent collection" : "01 — Current drop"}
      </p>
      <h1 className="mt-4 font-display text-6xl uppercase leading-[0.85] text-bone sm:text-8xl lg:text-[10rem]">
        <MaskText lines={[slug === "drop" ? "AW26" : district.name]} />
      </h1>

      {slug === "drop" ? (
        <div className="mt-8 grid gap-8 border-y border-graphite py-8 sm:grid-cols-2 sm:items-end lg:grid-cols-[1fr_auto] lg:py-10">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-bone">Autumn / Winter 2026</p>
            <p className="mt-5 max-w-lg text-sm leading-7 text-steel">Built for the city. Designed for what comes next.</p>
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-steel">{products.length} pieces</p>
        </div>
      ) : null}

      {slug === "core" ? (
        <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <p className="max-w-xl text-sm leading-7 text-steel">{description(slug)}</p>
          <Link href="/shop" className="link-line w-fit text-xs uppercase tracking-[0.3em] text-bone">
            Shop →
          </Link>
        </div>
      ) : null}

      {products.length === 0 ? (
        <div className="mt-16">
          <EmptyState
            testid={`collection-empty-${district.slug}`}
            kicker={district.name}
            title={slug === "drop" ? "No active drop" : "Collection unavailable"}
            body="Shop the current Lock City pieces."
            ctaHref="/shop"
            ctaLabel="Shop →"
          />
        </div>
      ) : (
        <div className="mx-auto mt-16 grid w-full max-w-[1800px] grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} priority={index < 3} />
          ))}
        </div>
      )}
    </div>
  );
}
