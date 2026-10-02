import { Hero } from "@/components/home/Hero";
import { CityExperience } from "@/components/home/CityExperience";
import { ProductShowcase } from "@/components/home/ProductShowcase";
import { BrandEditorial } from "@/components/home/BrandEditorial";
import { Aw26Hero } from "@/components/home/Aw26Hero";
import { Newsletter } from "@/components/Newsletter";
import { CatalogError } from "@/components/CatalogError";
import { commerce } from "@/lib/commerce";
import {
  homeCoreProducts,
  homeAw26Products,
  homeEditorialProducts,
  homeHeroProduct,
  homeSelectedProducts,
  HOME_AW26_VISIBLE,
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
  const aw26 = homeAw26Products(products);
  const core = homeCoreProducts(products);
  const selected = homeSelectedProducts(products);
  const editorial = homeEditorialProducts(products);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(onlineStoreStructuredData()) }}
      />
      {HOME_AW26_VISIBLE ? <Aw26Hero product={aw26[0]} /> : <Hero product={hero} />}
      <CityExperience />
      {catalogError ? <CatalogError error={catalogError} /> : (
        <>
          {HOME_AW26_VISIBLE ? (
            <div className="relative z-20 -mt-[16svh] bg-bg md:-mt-[29svh] motion-reduce:-mt-[8svh]">
              <ProductShowcase
                id="aw26-drop"
                scene="03 — Autumn Winter 2026"
                title="AW26 Drop"
                products={aw26}
                ctaHref="/collections/drop"
                ctaLabel="Explore AW26"
                layout="grid"
              />
            </div>
          ) : null}
          <div
            data-testid="core-reveal"
            className={`relative z-20 bg-bg ${HOME_AW26_VISIBLE ? "border-t border-graphite pt-8 sm:pt-16" : "-mt-[16svh] md:-mt-[29svh] motion-reduce:-mt-[8svh]"}`}
          >
            <ProductShowcase
              id="core"
              scene={HOME_AW26_VISIBLE ? "04 — Permanent pieces" : "03 — Permanent pieces"}
              title="Core"
              copy="Permanent Lock City pieces built around the lock — the symbol at the center of the city."
              products={core}
              ctaHref="/collections/core"
              ctaLabel="Explore core"
              layout="editorial"
            />
          </div>
          <ProductShowcase
            id="selected-shop"
            scene="04 — Shop selection"
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
