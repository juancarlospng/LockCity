import { Loader } from "@/components/home/Loader";
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
      <Loader />
      <Hero />
      <Marquee
        items={[
          "Lock City®",
          "The city is alive",
          "Locked in",
          "First drop — coming soon",
        ]}
      />
      <LatestDrop />
      <Districts />
      <TheCity />
      <People />
      <ArchiveTeaser />
      <Transmissions />
      <Newsletter />
    </>
  );
}
