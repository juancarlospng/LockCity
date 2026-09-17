import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Welcome to The City | Lock City",
  description: "Your place in The City is confirmed.",
};

export default function JoinConfirmedPage() {
  return (
    <div data-testid="join-confirmed-page" className="flex min-h-[75vh] flex-col items-start justify-center px-4 pb-24 pt-36 sm:px-8 lg:px-12 lg:pt-44">
      <p className="text-[10px] uppercase tracking-[0.3em] text-steel">Join The City</p>
      <h1 className="mt-5 font-display text-7xl uppercase leading-[0.86] text-bone sm:text-9xl">You&apos;re in.</h1>
      <p className="mt-7 max-w-md text-sm leading-7 text-steel">Your place in The City is confirmed.</p>
      <div className="mt-10 flex flex-wrap gap-4">
        <Link href="/shop" className="border border-bone px-8 py-4 text-xs font-bold uppercase tracking-[0.3em] text-bone transition-colors hover:bg-bone hover:text-bg">Shop</Link>
        <Link href="/" className="px-1 py-4 text-xs uppercase tracking-[0.3em] text-steel hover:text-bone">Return home</Link>
      </div>
    </div>
  );
}
