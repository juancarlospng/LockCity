import type { MetadataRoute } from "next";
import { commerce } from "@/lib/commerce";
import { activeDropProducts, coreProducts, publicStoreProducts } from "@/lib/merchandising";
import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

const STATIC_PATHS = [
  "/",
  "/shop",
  "/shipping",
  "/returns",
  "/contact",
  "/privacy",
  "/terms",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({ url: absoluteUrl(path) }));
  try {
    const allProducts = await commerce.getProducts();
    const products = publicStoreProducts(allProducts);
    for (const product of products) {
      entries.push({ url: absoluteUrl(`/product/${encodeURIComponent(product.slug)}`) });
    }
    if (coreProducts(allProducts).length > 0) {
      entries.push({ url: absoluteUrl("/collections/core") });
    }
    if (activeDropProducts(allProducts).length > 0) {
      entries.push({ url: absoluteUrl("/collections/drop") });
    }
  } catch {
    // A catalog outage must not make the sitemap endpoint fail completely.
  }
  return entries;
}
