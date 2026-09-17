import "server-only";
import type { Metadata } from "next";

export const DEFAULT_SITE_URL = "https://lock-city.vercel.app";
export const SITE_NAME = "Lock City";
export const SITE_DESCRIPTION =
  "Lock City is a streetwear system rendered as a place. Collections are districts. Products are objects.";

export function siteUrl(): URL {
  const configured = process.env.SITE_URL?.trim() || DEFAULT_SITE_URL;
  try {
    const parsed = new URL(configured);
    if (!/^https?:$/.test(parsed.protocol) || parsed.username || parsed.password) throw new Error("invalid");
    return new URL(parsed.origin);
  } catch {
    return new URL(DEFAULT_SITE_URL);
  }
}

export function absoluteUrl(pathname = "/"): string {
  return new URL(pathname, siteUrl()).toString();
}

export function productImagePath(slug: string): string {
  return `/product/${encodeURIComponent(slug)}/media`;
}

export function seoIndexingEnabled(): boolean {
  return process.env.SEO_INDEXING_ENABLED === "true";
}

export function publicRobots(): Metadata["robots"] {
  const enabled = seoIndexingEnabled();
  return {
    index: enabled,
    follow: enabled,
    googleBot: { index: enabled, follow: enabled },
  };
}

export function noIndexRobots(): Metadata["robots"] {
  const follow = seoIndexingEnabled();
  return {
    index: false,
    follow,
    googleBot: { index: false, follow },
  };
}

interface PageMetadataOptions {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
  absoluteTitle?: boolean;
  image?: string;
  type?: "website" | "article";
}

export function pageMetadata({
  title,
  description,
  path,
  noIndex = false,
  absoluteTitle = false,
  image,
  type = "website",
}: PageMetadataOptions): Metadata {
  const canonical = absoluteUrl(path);
  const imageUrl = image ? absoluteUrl(image) : undefined;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical },
    robots: noIndex ? noIndexRobots() : publicRobots(),
    openGraph: {
      type,
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      ...(imageUrl ? { images: [{ url: imageUrl, alt: title }] } : {}),
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  };
}

export function plainText(value?: string): string | undefined {
  const normalized = value
    ?.replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
  return normalized || undefined;
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
