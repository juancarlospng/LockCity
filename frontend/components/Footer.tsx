import Link from "@/components/StoreLink";

const COLUMNS = [
  {
    title: "City",
    links: [
      { href: "/shop", label: "Shop", testid: "footer-shop-link" },
      { href: "/drops", label: "Drops", testid: "footer-drops-link" },
      { href: "/people", label: "People", testid: "footer-people-link" },
      { href: "/archive", label: "Archive", testid: "footer-archive-link" },
      { href: "/city", label: "City", testid: "footer-city-link" },
      {
        href: "/transmissions",
        label: "Transmissions",
        testid: "footer-transmissions-link",
      },
      { href: "/cart", label: "Bag", testid: "footer-cart-link" },
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
              <span
                aria-hidden
                className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-bone"
              />
              Lock City Clothes
            </p>
            <p className="mt-4 text-xs leading-relaxed text-steel">
              Premium clothing and streetwear. A world of its own. Locked in
              with your purpose, your craft, your people, your city.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-12 sm:grid-cols-3">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="text-[12px] uppercase tracking-[0.3em] text-steel">
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
        <p className="whitespace-nowrap text-center font-display text-[16vw] uppercase leading-[0.85] tracking-tight text-steel">
          Locked in
        </p>
      </div>

      <div className="flex flex-col items-start justify-between gap-2 border-t border-graphite px-4 py-6 text-[12px] uppercase tracking-[0.25em] text-steel sm:flex-row sm:items-center sm:px-8 lg:px-12">
        <span>© 2026 Lock City</span>
        <span>The city is alive</span>
      </div>
    </footer>
  );
}
