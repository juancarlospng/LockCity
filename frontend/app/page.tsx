import { Loader } from "@/components/home/Loader";
import { Hero } from "@/components/home/Hero";
import { LatestDrop } from "@/components/home/LatestDrop";
import { ShopTheDrop } from "@/components/home/ShopTheDrop";
import { Districts } from "@/components/home/Districts";
import { FeaturedObject } from "@/components/home/FeaturedObject";
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
          "Drop_006 — Available now",
          "Mock data",
          "System 02",
        ]}
      />
      <LatestDrop />
      <ShopTheDrop />
      <Districts />
      <FeaturedObject />
      <TheCity />
      <People />
      <ArchiveTeaser />
      <Transmissions />
      <Newsletter />
    </>
  );
}
