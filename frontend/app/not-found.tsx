import Link from "next/link";

export default function NotFound() {
  return (
    <div
      data-testid="not-found-page"
      className="flex min-h-screen flex-col items-start justify-center px-4 sm:px-8 lg:px-12"
    >
      <p className="text-[10px] uppercase tracking-[0.3em] text-steel">Error 404</p>
      <h1 className="mt-6 font-display text-7xl uppercase leading-[0.85] text-bone sm:text-9xl">
        This street
        <br />
        doesn&rsquo;t exist
      </h1>
      <p className="mt-6 max-w-sm text-xs leading-relaxed text-steel">
        The address you followed leads outside the city limits.
      </p>
      <div className="mt-10 flex flex-wrap gap-4">
        <Link
          href="/"
          data-testid="not-found-home-link"
          className="border border-bone px-8 py-4 text-xs font-bold uppercase tracking-[0.3em] text-bone transition-colors duration-300 hover:bg-bone hover:text-bg"
        >
          Back to the city →
        </Link>
        <Link
          href="/shop"
          data-testid="not-found-shop-link"
          className="link-line px-1 py-4 text-xs uppercase tracking-[0.3em] text-steel hover:text-bone"
        >
          Shop →
        </Link>
      </div>
    </div>
  );
}
