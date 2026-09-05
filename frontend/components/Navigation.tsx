"use client";

import { AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";
import { MobileMenu } from "./MobileMenu";
import { SearchOverlay } from "./SearchOverlay";

export const NAV_LINKS = [
  { href: "/shop", label: "SHOP" },
  { href: "/collections/drop", label: "DROPS" },
  { href: "/city", label: "CITY" },
  { href: "/archive", label: "ARCHIVE" },
  { href: "/journal", label: "JOURNAL" },
];

export function Navigation() {
  const { count, openCart } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  return (
    <>
      <header
        data-testid="main-navigation"
        className={`fixed inset-x-0 top-0 z-[80] border-b transition-[background-color,padding,border-color] duration-500 ${
          scrolled
            ? "border-graphite bg-bg/85 backdrop-blur-xl"
            : "border-transparent bg-transparent"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4 sm:px-8 lg:px-12">
          <Link
            href="/"
            data-testid="nav-brand-logo"
            className="group flex items-center gap-2"
            aria-label="LOCK CITY home"
          >
            <span
              aria-hidden
              className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-bone"
            />
            <span className="font-display text-lg uppercase leading-none tracking-wide text-bone transition-transform duration-300 group-hover:-translate-y-0.5">
              Lock City<sup className="text-[9px]">®</sup>
            </span>
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-8 lg:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                data-testid={`nav-${link.label.toLowerCase()}-link`}
                className={`link-line text-[11px] uppercase tracking-[0.25em] transition-colors duration-200 ${
                  pathname === link.href ? "text-bone" : "text-steel hover:text-bone"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-5 sm:gap-7">
            <button
              type="button"
              data-testid="nav-search-trigger"
              onClick={() => setSearchOpen(true)}
              className="hidden text-[11px] uppercase tracking-[0.25em] text-steel transition-colors duration-200 hover:text-bone sm:block"
            >
              Search
            </button>
            <span className="hidden text-[11px] uppercase tracking-[0.25em] text-graphite sm:block">
              Account
            </span>
            <button
              type="button"
              data-testid="nav-cart-trigger"
              onClick={openCart}
              className="text-[11px] uppercase tracking-[0.25em] text-bone transition-colors duration-200 hover:text-steel"
              aria-label={`Open bag, ${count} items`}
            >
              Bag ({count})
            </button>
            <button
              type="button"
              data-testid="nav-menu-trigger"
              onClick={() => setMenuOpen(true)}
              className="flex flex-col gap-1.5 py-1 lg:hidden"
              aria-label="Open menu"
            >
              <span className="h-px w-6 bg-bone" />
              <span className="h-px w-6 bg-bone" />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && <MobileMenu onClose={() => setMenuOpen(false)} />}
        {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
