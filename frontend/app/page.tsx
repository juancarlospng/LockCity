import { SelectedObjects } from "@/components/home/SelectedObjects";
import { Hero } from "@/components/home/Hero";
import { LatestDrop } from "@/components/home/LatestDrop";
import { Districts } from "@/components/home/Districts";
import { TheCity } from "@/components/home/TheCity";
import { People } from "@/components/home/People";
import { ArchiveTeaser } from "@/components/home/ArchiveTeaser";
import { Transmissions } from "@/components/home/Transmissions";
import { Newsletter } from "@/components/Newsletter";
import { Marquee } from "@/components/Marquee";

export default function HomePage() {
  return (
    <>
      <Hero />
      <LatestDrop />
      <SelectedObjects />
      <Districts />
      <TheCity />
      <Marquee
        items={["Lock City Clothes", "Locked in", "The city is alive"]}
      />
      <People />
      <ArchiveTeaser />
      <Transmissions />
      <Newsletter />
    </>
  );
}
