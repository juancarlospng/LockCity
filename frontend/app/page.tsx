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
import { pageMetadata, serializeJsonLd, SITE_DESCRIPTION } from "@/lib/seo";
import { onlineStoreStructuredData } from "@/lib/structured-data";

export const metadata = pageMetadata({
  title: "Lock City",
  description: SITE_DESCRIPTION,
  path: "/",
  absoluteTitle: true,
});

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(onlineStoreStructuredData()) }}
      />
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
