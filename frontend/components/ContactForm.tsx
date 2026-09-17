"use client";

import { useState, type FormEvent } from "react";

export function ContactForm() {
  const [opened, setOpened] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const order = String(form.get("order") ?? "").trim();
    const subject = String(form.get("subject") ?? "").trim();
    const message = String(form.get("message") ?? "").trim();
    const body = [`Name: ${name}`, `Email: ${email}`, order ? `Order number: ${order}` : "", "", message]
      .filter((line) => line !== "")
      .join("\n");
    setOpened(true);
    window.location.href = `mailto:info@lockcityclothes.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const fieldClass = "mt-2 w-full border border-graphite bg-bg px-4 py-3 text-sm normal-case tracking-normal text-bone outline-none transition-colors focus:border-bone";
  const labelClass = "block text-[10px] uppercase tracking-[0.2em] text-steel";

  return (
    <form onSubmit={submit} className="border border-graphite bg-onyx p-5 sm:p-8" data-testid="contact-form">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className={labelClass}>Name *<input className={fieldClass} name="name" required autoComplete="name" /></label>
        <label className={labelClass}>Email *<input className={fieldClass} name="email" type="email" required autoComplete="email" /></label>
        <label className={labelClass}>Order number — optional<input className={fieldClass} name="order" autoComplete="off" /></label>
        <label className={labelClass}>Subject *<input className={fieldClass} name="subject" required /></label>
        <label className={`${labelClass} sm:col-span-2`}>Message *<textarea className={`${fieldClass} min-h-40 resize-y`} name="message" required /></label>
      </div>
      <button className="mt-7 w-full border border-bone px-6 py-4 text-[10px] uppercase tracking-[0.24em] text-bone transition-colors hover:bg-bone hover:text-bg" type="submit">
        Send message
      </button>
      {opened ? <p className="mt-4 text-xs leading-6 text-steel" role="status">Your email app should now be open with your message ready. Review it there, then send it.</p> : null}
      <p className="mt-5 text-xs leading-6 text-steel">For order-related requests, include your order number when possible.<br />Never send payment card details through this form.</p>
    </form>
  );
}
