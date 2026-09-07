"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { track } from "@/lib/analytics";
import { captureAttribution } from "@/lib/attribution";

export function AnalyticsRouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    captureAttribution();
    const query = searchParams.toString();
    const path = query ? `${pathname}?${query}` : pathname;
    track("page_view", {
      page_location: `${window.location.origin}${path}`,
      page_path: path,
      page_title: document.title,
    });
  }, [pathname, searchParams]);

  return null;
}
