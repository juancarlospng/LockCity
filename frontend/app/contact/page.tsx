import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Contact Lock City",
  description: "Contact Lock City about an order, shipping, product issue, collaboration or general question.",
};

export default function ContactPage() {
  return (
    <PolicyPage eyebrow="Customer care" title="Contact Lock City"
      intro="Questions about an order, shipping, product issue, collaboration or anything else related to Lock City?">
      <div className="mb-10 border-b border-graphite pb-10">
        <p className="text-[10px] uppercase tracking-[0.25em] text-steel">Email</p>
        <a className="mt-3 inline-block text-lg text-bone underline underline-offset-4" href="mailto:info@lockcityclothes.com">info@lockcityclothes.com</a>
      </div>
      <ContactForm />
    </PolicyPage>
  );
}
