import { notFound } from "next/navigation";
import { content } from "@/lib/content";
import { commerce } from "@/lib/commerce";
import { PersonDetail } from "@/components/ContentDetails";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const person = (await content.getPeople()).find((p) => p.slug === slug);
  if (!person) notFound();
  const products = (await commerce.getProducts()).filter((p) =>
    person.productsWorn?.includes(p.id),
  );
  return <PersonDetail person={person} products={products} />;
}
