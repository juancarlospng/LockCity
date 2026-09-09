import { notFound } from "next/navigation";
import { content } from "@/lib/content";
import { TransmissionDetail } from "@/components/ContentDetails";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const transmission = (await content.getTransmissions()).find(
    (p) => p.slug === slug,
  );
  if (!transmission) notFound();
  return <TransmissionDetail transmission={transmission} />;
}
