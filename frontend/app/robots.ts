import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/checkout", "/order-confirmation", "/join/confirmed", "/store/"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
