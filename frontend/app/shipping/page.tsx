import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage, PolicySection } from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Shipping Policy | Lock City",
  description: "Production times, worldwide delivery, tracking, customs and address information for Lock City orders.",
};

export default function ShippingPage() {
  return (
    <PolicyPage eyebrow="Customer care" title="Shipping Policy"
      intro="Worldwide delivery for made-to-order Lock City products, wherever fulfillment and delivery services are available.">
      <PolicySection title="Production & delivery">
        <p>Each Lock City product is produced on demand. Most orders are prepared for shipment within approximately 2–5 business days, although production times may vary depending on the product, order volume, availability and fulfillment location.</p>
        <p>Shipping time begins after production is complete.</p>
        <p>Shipping options and prices are calculated at checkout based on your order and delivery destination. Available methods may include Standard, Express or other options depending on location.</p>
        <p>Once your order ships, tracking information will be provided when available.</p>
      </PolicySection>
      <PolicySection title="International orders">
        <p>International orders may be subject to customs duties, import taxes or other fees imposed by the destination country. Unless these charges are included at checkout, they are the responsibility of the customer.</p>
        <p>For eligible orders to Canada and the United Kingdom, duties and taxes may be included in the shipping price when a Delivered Duty Paid option is available at checkout.</p>
        <p>Delivery estimates are not guaranteed. Customs procedures, carrier delays, weather, incorrect addresses or other circumstances outside our reasonable control may affect delivery.</p>
      </PolicySection>
      <PolicySection title="Incorrect or unclaimed addresses">
        <p>Customers are responsible for providing a complete and accurate shipping address.</p>
        <p>If a package is returned because of an incorrect or incomplete address, or because it was not claimed, additional shipping charges may apply before it can be sent again.</p>
        <p>For questions about an order, email <a className="text-bone underline underline-offset-4" href="mailto:info@lockcityclothes.com">info@lockcityclothes.com</a> or use our <Link className="text-bone underline underline-offset-4" href="/contact">Contact page</Link>.</p>
      </PolicySection>
    </PolicyPage>
  );
}
