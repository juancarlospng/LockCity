"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect } from "react";
import { NAV_LINKS } from "./Navigation";

export function MobileMenu({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      data-testid="mobile-menu"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[95] flex flex-col bg-bg"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
    >
      <div className="flex items-center justify-between px-4 py-4 sm:px-8">
        <span className="font-display text-lg uppercase tracking-wide text-bone">
          Lock City<sup className="text-[9px]">®</sup>
        </span>
        <button
          type="button"
          data-testid="mobile-menu-close-button"
          onClick={onClose}
          className="text-[11px] uppercase tracking-[0.25em] text-steel transition-colors hover:text-bone"
        >
          Close
        </button>
      </div>

      <nav
        aria-label="Mobile"
        className="flex flex-1 flex-col justify-center gap-2 px-6"
      >
        {[{ href: "/", label: "ENTER" }, ...NAV_LINKS].map((link, i) => (
          <motion.div
            key={link.href}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.08 + i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link
              href={link.href}
              data-testid={`mobile-nav-${link.label.toLowerCase()}-link`}
              className="group flex items-baseline gap-4 border-b border-graphite py-3"
            >
              <span className="text-[10px] tracking-[0.3em] text-steel">
                {String(i).padStart(2, "0")}
              </span>
              <span className="font-display text-5xl uppercase leading-none text-bone transition-transform duration-300 group-hover:translate-x-2">
                {link.label}
              </span>
            </Link>
          </motion.div>
        ))}
      </nav>

      <div className="flex items-center justify-between px-6 py-6 text-[10px] uppercase tracking-[0.25em] text-steel">
        <span>The city is alive</span>
        <span className="animate-pulse-dot">Locked in</span>
      </div>
    </motion.div>
  );
}
