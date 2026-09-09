"use client";
import { useState, type FormEvent } from "react";
import { MaskText } from "./Reveal";
export function Newsletter() {
  const [message, setMessage] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(
      "The list is not open yet. Your email has not been saved or sent.",
    );
  }
  return (
    <section
      id="join"
      data-testid="join-the-city-section"
      className="section-space border-t border-graphite"
      aria-labelledby="join-heading"
    >
      <div className="grid gap-12 lg:grid-cols-2">
        <div>
          <p className="eyebrow">Community</p>
          <h2 id="join-heading" className="section-title">
            <MaskText lines={["Join the city"]} />
          </h2>
          <p className="mt-6 text-steel">
            Drops. People. Transmissions. Early access.
          </p>
        </div>
        <form onSubmit={submit} className="self-end space-y-5">
          <p className="text-sm text-steel">The city list is not open yet.</p>
          <label className="block" htmlFor="newsletter-email">
            Email
          </label>
          <input
            id="newsletter-email"
            name="email"
            autoComplete="email"
            type="email"
            required
            className="lc-input"
            placeholder="you@example.com"
          />
          <label className="flex items-start gap-3 text-sm text-steel">
            <input
              type="checkbox"
              required
              className="mt-1 h-5 w-5 accent-stone-200"
            />
            I agree to receive Lock City communications.
          </label>
          <button type="submit" className="lc-button">
            Enter the city →
          </button>
          <p role="status" className="text-sm text-steel">
            {message}
          </p>
        </form>
      </div>
    </section>
  );
}
