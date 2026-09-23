"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { emailSignup } from "@/lib/analytics";
import { MaskText, Reveal } from "./Reveal";

type State = "idle" | "loading" | "pending_confirmation" | "error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<State>("idle");
  const submitting = useRef(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    const normalizedEmail = email.trim().toLocaleLowerCase("en-US");
    if (!consent || normalizedEmail.length > 254 || !EMAIL_RE.test(normalizedEmail)) {
      setState("error");
      return;
    }
    submitting.current = true;
    setState("loading");
    try {
      const res = await fetch("/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          consent,
          website,
        }),
      });
      if (res.ok) {
        emailSignup();
        setEmail(normalizedEmail);
        setState("pending_confirmation");
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    } finally {
      submitting.current = false;
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
              06 — Join the city
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
          {state === "pending_confirmation" ? (
            <div
              data-testid="newsletter-success"
              className="border border-graphite p-8"
            >
              <p className="font-display text-2xl uppercase text-bone">
                Check your inbox
              </p>
              <p className="mt-3 text-xs leading-relaxed text-steel">
                Confirm your place in The City.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="border-b border-graphite pb-2">
              <div hidden aria-hidden="true">
                <label htmlFor="newsletter-website">Website</label>
                <input id="newsletter-website" name="website" tabIndex={-1} autoComplete="off"
                  value={website} onChange={(event) => setWebsite(event.target.value)} />
              </div>
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
                  maxLength={254}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="YOU@THECITY.COM"
                  className="w-full bg-transparent py-3 text-sm uppercase tracking-[0.15em] text-bone placeholder:text-graphite focus:outline-none"
                />
                <button
                  type="submit"
                  data-testid="newsletter-submit-button"
                  disabled={state === "loading" || !consent}
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
                <span>
                  I agree to receive Lock City drops, releases, pre-order updates and selected news. I can unsubscribe at any time. See our{" "}
                  <Link href="/privacy" className="text-bone underline underline-offset-4">Privacy Policy</Link>.
                </span>
              </label>
              {state === "error" && (
                <p
                  data-testid="newsletter-error"
                  className="pb-3 text-[10px] uppercase tracking-[0.2em] text-steel"
                >
                  We couldn’t complete your request right now. Please try again.
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
