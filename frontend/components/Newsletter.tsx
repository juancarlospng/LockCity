"use client";

import { useState, type FormEvent } from "react";
import { emailSignup } from "@/lib/analytics";
import { MaskText, Reveal } from "./Reveal";

type State = "idle" | "loading" | "subscribed" | "unavailable" | "error";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<State>("idle");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch("/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          consent,
          language: navigator.language,
        }),
      });
      if (res.ok) {
        emailSignup();
        setState("subscribed");
      } else if (res.status === 503) {
        setState("unavailable");
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  };

  return (
    <section
      id="join"
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
          {state === "subscribed" ? (
            <div
              data-testid="newsletter-success"
              className="border border-graphite p-8"
            >
              <p className="font-display text-2xl uppercase text-bone">
                Welcome to the city
              </p>
              <p className="mt-3 text-xs leading-relaxed text-steel">
                You are on the list. The signal arrives with the first drop.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="border-b border-graphite pb-2">
              <label
                htmlFor="newsletter-email"
                className="text-[10px] uppercase tracking-[0.3em] text-steel"
              >
                Email
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
                  disabled={state === "loading"}
                  className="shrink-0 text-xs font-bold uppercase tracking-[0.3em] text-bone transition-colors duration-200 hover:text-steel disabled:text-graphite"
                >
                  {state === "loading" ? "…" : "Enter →"}
                </button>
              </div>
              <label className="mt-4 flex cursor-pointer items-start gap-3 pb-2 text-[10px] uppercase leading-relaxed tracking-[0.15em] text-steel">
                <input
                  type="checkbox"
                  data-testid="newsletter-consent-checkbox"
                  required
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 appearance-none border border-graphite bg-transparent checked:border-bone checked:bg-bone"
                />
                I agree to receive Lock City communications
              </label>
              {state === "unavailable" && (
                <p
                  data-testid="newsletter-unavailable"
                  className="pb-3 text-[10px] uppercase tracking-[0.2em] text-steel"
                >
                  The list is not open yet — the signal arrives soon
                </p>
              )}
              {state === "error" && (
                <p
                  data-testid="newsletter-error"
                  className="pb-3 text-[10px] uppercase tracking-[0.2em] text-steel"
                >
                  Something failed — check the email and try again
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
