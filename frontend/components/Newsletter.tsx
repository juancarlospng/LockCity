"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { MaskText, Reveal } from "./Reveal";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      toast.error("Enter a valid email — demo only");
      return;
    }
    setDone(true);
    toast.success("Transmission received — demo only");
  };

  return (
    <section
      data-testid="join-the-city-section"
      aria-labelledby="join-heading"
      className="relative border-t border-graphite px-4 py-28 sm:px-8 lg:px-12 lg:py-40"
    >
      <div className="flex flex-col gap-12 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Reveal>
            <p className="text-[10px] uppercase tracking-[0.3em] text-steel">
              Scene 10 — Citizenship
            </p>
          </Reveal>
          <h2
            id="join-heading"
            className="mt-6 font-display text-6xl uppercase leading-[0.9] text-bone sm:text-8xl lg:text-9xl"
          >
            <MaskText lines={["Join", "The City"]} />
          </h2>
        </div>

        <div className="w-full max-w-md">
          {done ? (
            <div
              data-testid="newsletter-success"
              className="border border-graphite p-8"
            >
              <p className="font-display text-2xl uppercase text-bone">
                Signal received
              </p>
              <p className="mt-3 text-xs leading-relaxed text-steel">
                You are on the list. Demo only — no email was sent and no provider
                is connected.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="border-b border-graphite pb-2">
              <label
                htmlFor="newsletter-email"
                className="text-[10px] uppercase tracking-[0.3em] text-steel"
              >
                Enter citizen email — Demo only
              </label>
              <div className="mt-3 flex items-center gap-4">
                <input
                  id="newsletter-email"
                  data-testid="newsletter-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="YOU@THECITY.COM"
                  className="w-full bg-transparent py-3 text-sm uppercase tracking-[0.15em] text-bone placeholder:text-graphite focus:outline-none"
                />
                <button
                  type="submit"
                  data-testid="newsletter-submit-button"
                  className="shrink-0 text-xs font-bold uppercase tracking-[0.3em] text-bone transition-colors duration-200 hover:text-steel"
                >
                  Enter →
                </button>
              </div>
            </form>
          )}
          <p className="mt-4 text-[9px] uppercase tracking-[0.25em] text-steel">
            Demo only — not connected to an email provider
          </p>
        </div>
      </div>
    </section>
  );
}
