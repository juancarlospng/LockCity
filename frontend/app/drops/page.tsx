import { content } from "@/lib/content";
import { ContentIndex } from "@/components/ContentIndex";
import { DropCard } from "@/components/ContentCards";
export const metadata = { title: "Drops — Lock City Clothes" };
export default async function Page() {
  const drops = await content.getDrops();
  return (
    <ContentIndex kind="drops" title="Drops" count={drops.length}>
      {drops.map((drop) => (
        <DropCard key={drop.id} drop={drop} />
      ))}
    </ContentIndex>
  );
}
