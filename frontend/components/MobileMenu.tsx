"use client";
import Link from "./StoreLink";
import { NAV_LINKS } from "./Navigation";
import { Modal } from "./Modal";
export function MobileMenu({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      label="Menu"
      onClose={onClose}
      testid="mobile-menu"
      className="mobile-menu"
    >
      <div className="flex items-center justify-between">
        <span className="font-display text-xl uppercase">
          Lock City Clothes
        </span>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
      <nav aria-label="Mobile" className="mt-8 grid">
        {[...NAV_LINKS, { href: "/cart", label: "BAG" }].map((link, i) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onClose}
            className="flex items-baseline gap-5 border-b border-graphite py-3"
          >
            <span aria-hidden="true" className="eyebrow text-steel">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="font-display text-3xl uppercase sm:text-4xl">
              {link.label}
            </span>
          </Link>
        ))}
      </nav>
    </Modal>
  );
}
