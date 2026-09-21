import { Loader } from "@/components/home/Loader";
import { Hero } from "@/components/home/Hero";
import { ProductShowcase } from "@/components/home/ProductShowcase";
import { BrandEditorial } from "@/components/home/BrandEditorial";
import { Newsletter } from "@/components/Newsletter";
import { Marquee } from "@/components/Marquee";
import { CatalogError } from "@/components/CatalogError";
import { commerce } from "@/lib/commerce";
import { coreProducts, selectedShopProducts } from "@/lib/merchandising";
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
  const core = coreProducts(products);
  const selected = selectedShopProducts(products);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(onlineStoreStructuredData()) }}
      />
      <Loader />
      <Hero />
      <Marquee
        items={[
          "Lock City®",
          "The city is alive",
          "Locked in",
          "Core",
        ]}
      />
      {catalogError ? <CatalogError error={catalogError} /> : (
        <>
          <ProductShowcase
            id="core"
            scene="02 — Permanent collection"
            title="Core"
            copy="Permanent Lock City pieces built around the lock — the symbol at the center of the city."
            products={core.slice(0, 4)}
            ctaHref="/collections/core"
            ctaLabel="Explore core"
          />
          <ProductShowcase
            id="selected-shop"
            scene="03 — Selected shop"
            title="Selected"
            products={selected}
            ctaHref="/shop"
            ctaLabel="Shop"
          />
        </>
      )}
      <BrandEditorial />
      <Newsletter />
    </>
  );
}
