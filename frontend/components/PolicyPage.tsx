import type { ReactNode } from "react";

export function PolicyPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <article className="px-4 pb-24 pt-32 sm:px-8 lg:px-12 lg:pb-36 lg:pt-40">
      <header className="border-b border-graphite pb-10 lg:pb-14">
        <p className="text-[10px] uppercase tracking-[0.3em] text-steel">{eyebrow}</p>
        <h1 className="mt-4 max-w-6xl font-display text-6xl uppercase leading-[0.88] text-bone sm:text-8xl lg:text-9xl">
          {title}
        </h1>
        {intro ? <p className="mt-7 max-w-2xl text-sm leading-7 text-steel">{intro}</p> : null}
      </header>
      <div className="legal-copy mx-auto mt-12 max-w-3xl text-sm leading-7 text-steel sm:mt-16">
        {children}
      </div>
    </article>
  );
}

export function PolicySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-graphite py-8 first:border-t-0 first:pt-0 sm:py-10">
      <h2 className="font-display text-3xl uppercase leading-none text-bone sm:text-4xl">{title}</h2>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}
