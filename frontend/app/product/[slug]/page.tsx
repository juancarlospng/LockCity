import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ProductDetail } from "@/components/ProductDetail";
import { commerce } from "@/lib/commerce";
import { CatalogError } from "@/components/CatalogError";
import type { Product } from "@/lib/types";
import { isPublicStoreProduct } from "@/lib/merchandising";
import { pageMetadata, plainText, productImagePath, serializeJsonLd } from "@/lib/seo";
import { productBreadcrumbData, productStructuredData } from "@/lib/structured-data";

export const dynamic = "force-dynamic";

const getProduct = cache((slug: string) => commerce.getProductBySlug(slug));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await getProduct(slug);
    if (!product) {
      return pageMetadata({
        title: "Product not found",
        description: "This product is not available in the Lock City catalog.",
        path: `/product/${encodeURIComponent(slug)}`,
        noIndex: true,
      });
    }
    return pageMetadata({
      title: product.name,
      description: plainText(product.description) ?? `${product.name} by Lock City.`,
      path: `/product/${encodeURIComponent(product.slug)}`,
      image: product.sourceImages[0]?.src ? productImagePath(product.slug) : undefined,
      noIndex: !isPublicStoreProduct(product.wooProductId),
    });
  } catch {
    return pageMetadata({
      title: "Product unavailable",
      description: "This product could not be loaded.",
      path: `/product/${encodeURIComponent(slug)}`,
      noIndex: true,
    });
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let product;
  try { product = await getProduct(slug); }
  catch (error) { return <CatalogError error={error} />; }
  if (!product || !isPublicStoreProduct(product.wooProductId)) notFound();
  let related: Product[] = [];
  let relatedError: unknown;
  try { related = await commerce.getRelatedProducts(product); }
  catch (error) { relatedError = error; }

  return <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(productStructuredData(product)) }}
    />
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(productBreadcrumbData(product)) }}
    />
    <ProductDetail product={product} related={related} />
    {relatedError ? <CatalogError error={relatedError} /> : null}</>;
}
