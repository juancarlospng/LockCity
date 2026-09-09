import { content } from "@/lib/content";
import { ContentIndex } from "@/components/ContentIndex";
import { ArchiveCard } from "@/components/ContentCards";
export const metadata = { title: "The Archive — Lock City Clothes" };
export default async function Page() {
  const records = await content.getArchive();
  return (
    <ContentIndex kind="archive" title="The archive" count={records.length}>
      {records.map((entry) => (
        <ArchiveCard key={entry.id} entry={entry} />
      ))}
    </ContentIndex>
  );
}
