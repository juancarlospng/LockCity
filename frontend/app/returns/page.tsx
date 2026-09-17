import { PolicyPage, PolicySection } from "@/components/PolicyPage";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Returns & Refunds",
  description: "Lock City policy for made-to-order returns, damaged or incorrect items, lost packages and approved refunds.",
  path: "/returns",
});

export default function ReturnsPage() {
  return (
    <PolicyPage eyebrow="Customer care" title="Returns & Refunds"
      intro="Our products are made to order. Review the conditions below before placing your order.">
      <PolicySection title="Made-to-order products">
        <p>Lock City products are made to order. For that reason, we generally do not accept returns or exchanges because of:</p>
        <ul className="list-disc space-y-2 pl-5 text-bone">
          <li>change of mind;</li><li>selecting the wrong size;</li><li>selecting the wrong color.</li>
        </ul>
        <p>This does not affect any mandatory consumer rights that may apply under the laws of your country.</p>
      </PolicySection>
      <PolicySection title="Damaged, defective or incorrect items">
        <p>If your product arrives damaged, defective, misprinted or incorrect, contact us within 30 days of delivery.</p>
        <p>We may ask for clear photographs of the item and the issue so we can review the claim.</p>
        <p>When a claim is approved, Lock City may provide a replacement or refund as appropriate.</p>
      </PolicySection>
      <PolicySection title="Lost packages">
        <p>If your package has not arrived, contact us within 30 days after the estimated delivery date so the shipment can be investigated.</p>
      </PolicySection>
      <PolicySection title="Refunds">
        <p>Approved refunds are returned to the original payment method.</p>
        <p>Processing time after approval may depend on your payment provider or financial institution.</p>
      </PolicySection>
      <PolicySection title="Wrong or incomplete address">
        <p>If an order is returned because the customer supplied an incorrect or incomplete address or did not claim the package, the customer is responsible for the cost of reshipping it.</p>
        <p>Contact: <a className="text-bone underline underline-offset-4" href="mailto:info@lockcityclothes.com">info@lockcityclothes.com</a></p>
      </PolicySection>
    </PolicyPage>
  );
}
