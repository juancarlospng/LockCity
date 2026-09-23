import { Hero } from "@/components/home/Hero";
import { CityExperience } from "@/components/home/CityExperience";
import { ProductShowcase } from "@/components/home/ProductShowcase";
import { BrandEditorial } from "@/components/home/BrandEditorial";
import { Newsletter } from "@/components/Newsletter";
import { CatalogError } from "@/components/CatalogError";
import { commerce } from "@/lib/commerce";
import {
  homeCoreProducts,
  homeEditorialProducts,
  homeHeroProduct,
  homeSelectedProducts,
} from "@/lib/home-merchandising";
import { pageMetadata, serializeJsonLd, SITE_DESCRIPTION } from "@/lib/seo";
import { onlineStoreStructuredData } from "@/lib/structured-data";
import type { Product } from "@/lib/types";

export const metadata = pageMetadata({
  title: "Lock City",
  description: SITE_DESCRIPTION,
  path: "/",
  absoluteTitle: true,
});

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let products: Product[];
  let catalogError: unknown;
  try { products = await commerce.getProducts(); }
  catch (error) { catalogError = error; products = []; }
  const hero = homeHeroProduct(products);
  const core = homeCoreProducts(products);
  const selected = homeSelectedProducts(products);
  const editorial = homeEditorialProducts(products);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(onlineStoreStructuredData()) }}
      />
      <CityExperience />
      <Hero product={hero} />
      {catalogError ? <CatalogError error={catalogError} /> : (
        <>
          <ProductShowcase
            id="core"
            scene="02 — Permanent pieces"
            title="Core"
            copy="Permanent Lock City pieces built around the lock — the symbol at the center of the city."
            products={core}
            ctaHref="/collections/core"
            ctaLabel="Explore core"
            layout="editorial"
          />
          <ProductShowcase
            id="selected-shop"
            scene="03 — Shop selection"
            title="Selected from the city"
            products={selected}
            ctaHref="/shop"
            ctaLabel="View shop"
            layout="grid"
          />
        </>
      )}
      <BrandEditorial products={editorial} />
      <Newsletter />
    </>
  );
}
