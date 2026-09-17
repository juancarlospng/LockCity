import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage, PolicySection } from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Terms & Conditions | Lock City",
  description: "Terms governing purchases from the Lock City online store, including made-to-order products and pre-orders.",
};

export default function TermsPage() {
  return (
    <PolicyPage eyebrow="Legal" title="Terms & Conditions"
      intro="These Terms govern purchases made from Lock City Clothes By Yanio Concepcion Jr. SRL through the Lock City online store.">
      <p className="mb-10">By placing an order, you agree to these Terms and to the policies referenced during checkout.</p>
      <PolicySection title="Products">
        <p>Lock City products may be produced on demand. Product colors and appearance may vary slightly depending on screens, materials and production processes.</p>
        <p>Customers are responsible for selecting the correct product, size, color and other available options before completing an order.</p>
      </PolicySection>
      <PolicySection title="Prices and payment">
        <p>Prices are shown in the currency displayed during checkout.</p>
        <p>The full order total, including available shipping charges and applicable taxes or duties collected by us, will be shown before you confirm payment.</p>
        <p>Orders are not considered successfully paid until payment has been confirmed.</p>
      </PolicySection>
      <PolicySection title="Availability">
        <p>Products and variants are subject to availability.</p>
        <p>We may refuse or cancel an order when a product cannot be fulfilled, when payment cannot be confirmed or where an obvious pricing or technical error has occurred.</p>
        <p>If payment has already been collected for an order we cannot fulfill, an appropriate refund will be issued.</p>
      </PolicySection>
      <PolicySection title="Shipping">
        <p>Shipping methods, costs and estimated delivery times depend on destination and the contents of the order.</p>
        <p>See our <Link href="/shipping" className="text-bone underline underline-offset-4">Shipping Policy</Link> for more information.</p>
      </PolicySection>
      <PolicySection title="Returns and refunds">
        <p>Because products are made to order, returns and exchanges for change of mind, incorrect size selection or incorrect color selection are generally not accepted.</p>
        <p>Damaged, defective, incorrect or lost orders are handled according to our <Link href="/returns" className="text-bone underline underline-offset-4">Returns & Refunds Policy</Link>.</p>
      </PolicySection>
      <PolicySection title="Pre-orders">
        <p>Products identified as PRE-ORDER are charged in full when the order is placed.</p>
        <p>A pre-order may be cancelled before it enters production.</p>
        <p>Once production has started, the normal made-to-order Returns & Refunds Policy applies.</p>
        <p>Any estimated production or shipping window shown for a pre-order is an estimate and may change.</p>
      </PolicySection>
      <PolicySection title="Intellectual property">
        <p>The Lock City name, logos, designs, graphics, photographs, copy and other original content are owned by or licensed to Lock City and may not be reproduced or commercially used without permission.</p>
      </PolicySection>
      <PolicySection title="Liability">
        <p>Nothing in these Terms excludes rights or protections that cannot legally be excluded.</p>
        <p>To the extent permitted by applicable law, Lock City is not responsible for delays or failures caused by events outside its reasonable control.</p>
      </PolicySection>
      <PolicySection title="Governing law">
        <p>These Terms are governed by the laws of the Dominican Republic, without prejudice to mandatory consumer protection rights that may apply in the customer&apos;s country of residence.</p>
      </PolicySection>
      <PolicySection title="Contact">
        <p>Questions about these Terms or an order can be sent to:</p>
        <p><a className="text-bone underline underline-offset-4" href="mailto:info@lockcityclothes.com">info@lockcityclothes.com</a></p>
      </PolicySection>
    </PolicyPage>
  );
}
