interface MarqueeProps {
  items: string[];
  className?: string;
  slow?: boolean;
}

export function Marquee({ items, className = "", slow = true }: MarqueeProps) {
  const row = (ariaHidden: boolean) => (
    <div
      aria-hidden={ariaHidden}
      className="flex shrink-0 items-center gap-10 pr-10"
    >
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-10">
          <span className="whitespace-nowrap">{item}</span>
          <span aria-hidden className="h-1 w-1 rounded-full bg-steel" />
        </span>
      ))}
    </div>
  );

  return (
    <div
      className={`relative flex overflow-hidden border-y border-graphite py-4 text-[11px] uppercase tracking-[0.3em] text-steel ${className}`}
    >
      <div
        className="flex animate-marquee"
        style={slow ? { animationDuration: "60s" } : undefined}
      >
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
