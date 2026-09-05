import Link from "next/link";

const COLUMNS = [
  {
    title: "City",
    links: [
      { href: "/shop", label: "Shop", testid: "footer-shop-link" },
      { href: "/collections/drop", label: "Drops", testid: "footer-drops-link" },
      { href: "/archive", label: "Archive", testid: "footer-archive-link" },
      { href: "/city", label: "City", testid: "footer-city-link" },
      { href: "/journal", label: "Journal", testid: "footer-journal-link" },
    ],
  },
  {
    title: "Signal",
    links: [
      { href: "#", label: "Instagram", testid: "footer-instagram-link" },
      { href: "#", label: "TikTok", testid: "footer-tiktok-link" },
      { href: "#", label: "Contact [Pending]", testid: "footer-contact-link" },
    ],
  },
  {
    title: "System",
    links: [
      { href: "#", label: "Legal [Pending]", testid: "footer-legal-link" },
      { href: "#", label: "Privacy [Pending]", testid: "footer-privacy-link" },
      { href: "#", label: "Terms [Pending]", testid: "footer-terms-link" },
    ],
  },
];

export function Footer() {
  return (
    <footer
      data-testid="site-footer"
      className="relative overflow-hidden border-t border-graphite bg-bg"
    >
      <div className="px-4 pt-20 sm:px-8 lg:px-12">
        <div className="flex flex-col justify-between gap-16 lg:flex-row">
          <div className="max-w-sm">
            <p className="flex items-center gap-2 font-display text-2xl uppercase text-bone">
              <span aria-hidden className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-bone" />
              Lock City<sup className="text-[10px]">®</sup>
            </p>
            <p className="mt-4 text-xs leading-relaxed text-steel">
              A digital place. Collections are districts. Products are objects.
              Prototype build — all content is mock data.
            </p>
            <p className="mt-6 text-[10px] uppercase tracking-[0.25em] text-steel">
              EU / EN — [Information pending]
            </p>
          </div>

          <div className="grid grid-cols-2 gap-12 sm:grid-cols-3">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="text-[10px] uppercase tracking-[0.3em] text-steel">
                  {col.title}
                </h3>
                <ul className="mt-5 space-y-3">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        data-testid={link.testid}
                        className="link-line text-xs uppercase tracking-[0.2em] text-bone/80 transition-colors hover:text-bone"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="select-none px-2 pt-16" aria-hidden>
        <p className="whitespace-nowrap text-center font-display text-[11.5vw] uppercase leading-[0.85] tracking-tight text-graphite/60">
          The city never sleeps
        </p>
      </div>

      <div className="flex flex-col items-start justify-between gap-2 border-t border-graphite px-4 py-6 text-[9px] uppercase tracking-[0.25em] text-steel sm:flex-row sm:items-center sm:px-8 lg:px-12">
        <span>© 2026 Lock City — Prototype. Mock data only.</span>
        <span>System 02 / V2.0 — [Placeholder copy, not an official slogan]</span>
      </div>
    </footer>
  );
}
