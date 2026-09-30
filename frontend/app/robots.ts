import type { MetadataRoute } from "next";
import { absoluteUrl, seoIndexingEnabled } from "@/lib/seo";
import { DROP_VISIBLE } from "@/lib/merchandising";

export default function robots(): MetadataRoute.Robots {
  if (!seoIndexingEnabled()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/checkout",
        "/order-confirmation",
        "/join/confirmed",
        "/store/",
        ...(!DROP_VISIBLE ? ["/collections/drop"] : []),
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
