import type { Metadata } from "next";
import { PolicyPage, PolicySection } from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Privacy Policy | Lock City",
  description: "How Lock City collects, uses, protects and shares personal information, and the privacy rights available to you.",
};

export default function PrivacyPage() {
  return (
    <PolicyPage eyebrow="Legal" title="Privacy Policy"
      intro="Last updated: August 12, 2026">
      <p className="mb-4">Lock City Clothes (“Lock City”, “we”, “us”, or “our”) respects your privacy and is committed to handling personal information responsibly and transparently.</p>
      <p className="mb-10">This Privacy Policy explains how personal information may be collected, used, stored, and shared when you visit our website, contact us, purchase our products or services, or interact with the official Lock City GPT available through ChatGPT.</p>

      <PolicySection title="1. Who we are">
        <p>Lock City Clothes is a fashion, lifestyle, and cultural brand.</p>
        <p>The entity responsible for the processing of personal information under this Privacy Policy is:</p>
        <address className="not-italic text-bone">
          Lock City Clothes<br />
          Operated by: Lock City Clothes By Yanio Concepcion Jr. SRL<br />
          Presidente Meriño, La Vega, Republica Dominicana<br />
          Email: <a className="underline underline-offset-4" href="mailto:info@lockcityclothes.com">info@lockcityclothes.com</a><br />
          Website: <a className="underline underline-offset-4" href="https://www.lockcityclothes.com">www.lockcityclothes.com</a>
        </address>
        <p>For privacy-related questions or requests, please contact us using the email address above.</p>
      </PolicySection>

      <PolicySection title="2. Information we may collect">
        <h3 className="text-xs uppercase tracking-[0.2em] text-bone">Information you provide directly</h3>
        <ul className="list-disc space-y-2 pl-5">
          <li>Name</li><li>Email address</li><li>Telephone number</li><li>Billing and shipping information</li>
          <li>Information submitted through contact forms</li><li>Customer support communications</li>
          <li>Newsletter or marketing preferences</li><li>Order-related information</li>
          <li>Information voluntarily provided when interacting with Lock City services</li>
        </ul>
        <p>We ask users not to provide sensitive personal information unless it is necessary for a specific request.</p>
        <h3 className="pt-3 text-xs uppercase tracking-[0.2em] text-bone">Transaction and order information</h3>
        <p>If you purchase a product through Lock City, information necessary to process and fulfil the transaction may be collected, including customer name, contact details, billing information, shipping address, products ordered, order history and transaction status.</p>
        <p>Payment card details may be handled directly by our payment service providers rather than stored directly by Lock City.</p>
        <h3 className="pt-3 text-xs uppercase tracking-[0.2em] text-bone">Technical information</h3>
        <p>When you use our website, certain technical information may be processed automatically, including your IP address, browser and device type, operating system, approximate location derived from your IP address, pages visited, date and time of access, referral information, and website interaction and performance data.</p>
        <p>This information may be used for security, website operation, analytics, performance monitoring, and improvement of our services.</p>
      </PolicySection>

      <PolicySection title="3. Lock City GPT and artificial intelligence">
        <p>Lock City may provide an official AI-powered assistant through OpenAI&apos;s ChatGPT platform (“Lock City GPT”).</p>
        <p>The Lock City GPT may be used to provide information about the brand, products, collections, culture, styling, customer questions, or other Lock City-related topics.</p>
        <p>The Lock City GPT operates within the ChatGPT platform and is powered by OpenAI. Lock City does not automatically receive or have access to individual private conversations users have with the Lock City GPT through the standard GPT interface.</p>
        <p>OpenAI independently processes information submitted through ChatGPT in accordance with OpenAI&apos;s own terms, privacy policies, data controls, and applicable service settings.</p>
        <p>Users should avoid entering unnecessary sensitive personal information, payment card information, passwords, authentication credentials, confidential information, or other information they do not wish to submit through an AI service.</p>
      </PolicySection>

      <PolicySection title="4. Connected services">
        <p>The Lock City GPT may, now or in the future, connect with trusted external services to complete a request.</p>
        <p>Where a connected service is used, information necessary to perform the requested action may be transmitted to the relevant service.</p>
        <p>Examples include services used to retrieve product information, check product availability, search collections, process customer requests, connect with our online store, manage orders, submit contact requests, support customer relationships, or provide other Lock City digital services.</p>
        <p>Only information reasonably necessary to carry out the requested function should be transmitted. External service providers may process information according to their own privacy policies and contractual obligations.</p>
      </PolicySection>

      <PolicySection title="5. How we use personal information">
        <ul className="list-disc space-y-2 pl-5">
          <li>Operate and maintain the Lock City website</li><li>Provide requested services</li>
          <li>Process and fulfil orders</li><li>Communicate with customers</li>
          <li>Respond to questions and support requests</li><li>Provide information about Lock City products and collections</li>
          <li>Improve our website, products, and digital experiences</li><li>Operate services connected to the Lock City GPT</li>
          <li>Prevent fraud, abuse, and security incidents</li><li>Maintain appropriate security</li>
          <li>Perform analytics and understand website usage</li>
          <li>Send marketing communications where permitted or where consent has been provided</li>
          <li>Comply with legal, accounting, tax, or regulatory obligations</li>
          <li>Establish, exercise, or defend legal claims</li>
        </ul>
        <p>Depending on the circumstances, processing may be based on contractual necessity, consent, legal obligations, legitimate interests, or another basis permitted by applicable law.</p>
      </PolicySection>

      <PolicySection title="6. Service providers and third parties">
        <p>Lock City may use trusted service providers that help us process payments, fulfill and deliver orders, operate our website, communicate with customers, prevent fraud and measure site performance.</p>
        <p>Depending on the services currently used by Lock City, these may include providers for website hosting, online commerce, payment processing, order fulfilment, print-on-demand or manufacturing, shipping and logistics, email, customer support, analytics, advertising, cloud services, cybersecurity, business administration and artificial intelligence, including OpenAI and ChatGPT-related functionality.</p>
        <p>We aim to disclose personal information only where reasonably necessary for the relevant service, business operation, or legal obligation.</p>
      </PolicySection>

      <PolicySection title="7. Cookies and similar technologies">
        <p>Our website may use cookies or similar technologies necessary for website functionality, security, preferences, analytics, shopping functionality, and, where applicable, marketing.</p>
        <p>Where required by applicable law, non-essential cookies or similar tracking technologies will be used only after appropriate notice or consent has been obtained.</p>
      </PolicySection>

      <PolicySection title="8. Marketing communications">
        <p>If you subscribe to Lock City marketing communications, we may use your contact information to send updates concerning new collections, product launches, drops, events, collaborations, brand news, offers, and promotions.</p>
        <p>You may unsubscribe at any time using the unsubscribe option included in the relevant communication or by contacting us.</p>
      </PolicySection>

      <PolicySection title="9. Data retention">
        <p>We retain personal information only for as long as reasonably necessary for the purposes for which it was collected, including business, contractual, accounting, tax, security, dispute-resolution, and legal requirements.</p>
        <p>When information is no longer required, we may delete, anonymize, or securely archive it where appropriate.</p>
      </PolicySection>

      <PolicySection title="10. International data transfers">
        <p>Some providers supporting our website, orders, payments, fulfilment, analytics or AI services may operate in countries other than the country in which you live.</p>
        <p>Where required by applicable data protection law, appropriate safeguards will be used for international transfers of personal information.</p>
      </PolicySection>

      <PolicySection title="11. Data security">
        <p>We take reasonable technical and organizational measures designed to protect personal information against unauthorized access, loss, misuse, alteration, disclosure, or destruction.</p>
        <p>However, no internet transmission, digital platform, or information-storage system can guarantee absolute security.</p>
      </PolicySection>

      <PolicySection title="12. Your privacy rights">
        <p>Depending on where you live and the law applicable to you, you may have rights concerning your personal information, including the right to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Request information about whether we process your personal information</li>
          <li>Request access to your personal information</li><li>Request correction of inaccurate information</li>
          <li>Request deletion of personal information where legally permitted</li>
          <li>Object to or restrict certain processing</li><li>Withdraw consent where processing is based on consent</li>
          <li>Request portability of certain information where applicable</li><li>Object to certain direct marketing activities</li>
          <li>Submit a complaint to the competent data protection authority</li>
        </ul>
        <p>To exercise a privacy right, contact: <a className="text-bone underline underline-offset-4" href="mailto:info@lockcityclothes.com">info@lockcityclothes.com</a></p>
      </PolicySection>

      <PolicySection title="13. Children">
        <p>Lock City services are not intentionally designed to collect personal information from young children without appropriate authorization.</p>
        <p>If you believe that a child has provided personal information to Lock City inappropriately, please contact us so that the situation can be reviewed and appropriate action taken.</p>
      </PolicySection>

      <PolicySection title="14. Third-party websites and platforms">
        <p>Our website, social media accounts, GPT, or other digital services may contain links to third-party websites or platforms.</p>
        <p>Lock City is not responsible for the privacy practices of independent third parties.</p>
      </PolicySection>

      <PolicySection title="15. Changes to this Privacy Policy">
        <p>We may update this Privacy Policy when our services, technology, legal obligations, or business practices change.</p>
        <p>The latest version will be published on this page, and the “Last updated” date at the top will be revised accordingly.</p>
      </PolicySection>

      <PolicySection title="16. Contact">
        <address className="not-italic text-bone">
          Lock City Clothes<br />Lock City Clothes By Yanio Concepcion Jr. SRL<br />
          Presidente Meriño, La Vega, Republica Dominicana<br />
          Email: <a className="underline underline-offset-4" href="mailto:info@lockcityclothes.com">info@lockcityclothes.com</a><br />
          Website: <a className="underline underline-offset-4" href="https://www.lockcityclothes.com">www.lockcityclothes.com</a>
        </address>
      </PolicySection>
    </PolicyPage>
  );
}
