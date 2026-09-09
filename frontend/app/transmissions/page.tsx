import { content } from "@/lib/content";
import { ContentIndex } from "@/components/ContentIndex";
import { TransmissionCard } from "@/components/ContentCards";
export const metadata = { title: "Transmissions — Lock City Clothes" };
export default async function Page() {
  const records = await content.getTransmissions();
  return (
    <ContentIndex
      kind="transmissions"
      title="Transmissions"
      count={records.length}
    >
      {records.map((transmission) => (
        <TransmissionCard key={transmission.id} transmission={transmission} />
      ))}
    </ContentIndex>
  );
}
