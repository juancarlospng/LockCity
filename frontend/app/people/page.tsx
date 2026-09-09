import { content } from "@/lib/content";
import { ContentIndex } from "@/components/ContentIndex";
import { PersonCard } from "@/components/ContentCards";
export const metadata = { title: "People of the City — Lock City Clothes" };
export default async function Page() {
  const people = await content.getPeople();
  return (
    <ContentIndex
      kind="people"
      title="People of the city"
      count={people.length}
    >
      {people.map((person) => (
        <PersonCard key={person.id} person={person} />
      ))}
    </ContentIndex>
  );
}
