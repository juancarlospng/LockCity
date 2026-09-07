import Link from "next/link";

// Honest empty state — used wherever real data (products, drops, people,
// transmissions) is not yet available. Never shows fabricated content.
export function EmptyState({
  kicker,
  title,
  body,
  ctaHref,
  ctaLabel,
  testid,
}: {
  kicker: string;
  title: string;
  body: string;
  ctaHref?: string;
  ctaLabel?: string;
  testid: string;
}) {
  return (
    <div
      data-testid={testid}
      className="flex flex-col items-start gap-6 border border-graphite px-6 py-16 sm:px-12 lg:py-24"
    >
      <p className="text-[10px] uppercase tracking-[0.3em] text-steel">{kicker}</p>
      <p className="font-display text-4xl uppercase leading-[0.95] text-bone sm:text-6xl">
        {title}
      </p>
      <p className="max-w-md text-xs leading-relaxed text-steel">{body}</p>
      {ctaHref && ctaLabel && (
        <Link
          href={ctaHref}
          data-testid={`${testid}-cta`}
          className="border border-bone px-8 py-4 text-xs font-bold uppercase tracking-[0.3em] text-bone transition-colors duration-300 hover:bg-bone hover:text-bg"
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
