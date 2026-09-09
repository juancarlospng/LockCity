import { notFound } from "next/navigation";
import { content } from "@/lib/content";
import { DropDetail } from "@/components/ContentDetails";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const drop = (await content.getDrops()).find((p) => p.slug === slug);
  if (!drop) notFound();
  return <DropDetail drop={drop} />;
}
