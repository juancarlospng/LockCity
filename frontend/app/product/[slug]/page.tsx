import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/ProductDetail";
import { commerce } from "@/lib/commerce";
import { CatalogError } from "@/components/CatalogError";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let product;
  try { product = await commerce.getProductBySlug(slug); }
  catch (error) { return <CatalogError error={error} />; }
  if (!product) notFound();
  let all: Product[] = [];
  let relatedError: unknown;
  try { all = await commerce.getProducts(); }
  catch (error) { relatedError = error; }
  const related = all
    .filter((p) => p.id !== product.id && p.category === product.category)
    .concat(all.filter((p) => p.id !== product.id && p.category !== product.category))
    .slice(0, 3);

  return <><ProductDetail product={product} related={related} />
    {relatedError ? <CatalogError error={relatedError} /> : null}</>;
}
