"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="page-shell min-h-[70svh]">
      <p className="eyebrow">Lock City Clothes</p>
      <h1 className="page-title">A brief interruption</h1>
      <p className="mt-6 text-steel">
        This page could not be displayed. Please try again.
      </p>
      <button type="button" className="lc-button mt-8" onClick={reset}>
        Try again
      </button>
      <a href="/shop" className="lc-button ml-4 mt-8">
        Return to shop
      </a>
    </div>
  );
}
