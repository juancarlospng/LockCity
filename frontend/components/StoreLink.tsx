"use client";
import Link from "next/link";
import { useEffect, useState, type ComponentProps } from "react";
import { usePathname } from "next/navigation";
const KEYS = ["utm_source", "utm_medium", "utm_campaign", "ref", "promoter"];
export function preserveQuery(href: string, search: string) {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const target = new URL(href, "https://lockcity.invalid");
  const current = new URLSearchParams(search);
  for (const key of KEYS)
    if (!target.searchParams.has(key) && current.has(key))
      target.searchParams.set(key, current.get(key)!);
  return target.pathname + target.search + target.hash;
}
export default function StoreLink({
  href,
  ...props
}: ComponentProps<typeof Link>) {
  const [search, setSearch] = useState("");
  const pathname = usePathname();
  useEffect(() => {
    setSearch(window.location.search);
  }, [pathname]);
  return (
    <Link
      {...props}
      href={typeof href === "string" ? preserveQuery(href, search) : href}
    />
  );
}
