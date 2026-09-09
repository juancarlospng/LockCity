import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/ProductDetail";
import { commerce } from "@/lib/commerce";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await commerce.getProductBySlug(slug);
  if (!product) notFound();
  const all = await commerce.getProducts();
  const related = all
    .filter((p) => p.id !== product.id && p.category === product.category)
    .concat(
      all.filter((p) => p.id !== product.id && p.category !== product.category),
    )
    .slice(0, 3);

  return <ProductDetail product={product} related={related} />;
}
