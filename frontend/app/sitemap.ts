import type { MetadataRoute } from "next";
import { commerce } from "@/lib/commerce";
import { DISTRICTS } from "@/lib/districts";
import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

const STATIC_PATHS = [
  "/",
  "/shop",
  "/city",
  "/shipping",
  "/returns",
  "/contact",
  "/privacy",
  "/terms",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({ url: absoluteUrl(path) }));
  try {
    const products = await commerce.getProducts();
    for (const product of products) {
      entries.push({ url: absoluteUrl(`/product/${encodeURIComponent(product.slug)}`) });
    }
    for (const district of DISTRICTS) {
      if (products.some((product) => product.categories.some((category) => category.slug === district.slug))) {
        entries.push({ url: absoluteUrl(`/collections/${encodeURIComponent(district.slug)}`) });
      }
    }
  } catch {
    // A catalog outage must not make the sitemap endpoint fail completely.
  }
  return entries;
}
