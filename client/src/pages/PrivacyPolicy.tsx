import PageHead, { buildWebPageJsonLd } from "@/components/PageHead";
import { SITE_URL } from "@/lib/siteConfig";

const PP_CANONICAL = `${SITE_URL}/privacy`;

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <PageHead
        title="Privacy Policy | UnifyOne"
        description="UnifyOne Privacy Policy — how 1Commerce LLC collects, uses, and protects your data in compliance with CCPA and GDPR. Last updated March 2026."
        canonical={PP_CANONICAL}
        jsonLd={buildWebPageJsonLd({
          canonical: PP_CANONICAL,
          name: "Privacy Policy | UnifyOne",
          description:
            "How 1Commerce LLC collects, uses, and protects your data in compliance with CCPA and GDPR.",
          breadcrumbs: [{ name: "Privacy Policy", item: PP_CANONICAL }],
        })}
      />
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground text-sm">
            UnifyOne · 1Commerce LLC · Last updated: March 2026
          </p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold mb-3">
              1. Information We Collect
            </h2>
            <p>
              UnifyOne ("UnifyOne," "we," "us," or "our") collects information
              you provide directly to us, such as when you create an account,
              subscribe to our service, or contact us for support. This
              includes:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-sm">
              <li>
                Account information: name, email address, company name, and
                password
              </li>
              <li>
                Payment information: billing address and payment method details
                (processed securely via Stripe and PayPal)
              </li>
              <li>
                Store data: products, orders, customer records, and inventory
                you manage through the platform
              </li>
              <li>
                Usage data: log files, IP addresses, browser type, pages
                visited, and feature interactions
              </li>
              <li>Communications: messages you send us via support channels</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              2. How We Use Your Information
            </h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-sm">
              <li>Provide, maintain, and improve the UnifyOne platform</li>
              <li>
                Process transactions and send related information, including
                purchase confirmations and invoices
              </li>
              <li>
                Send technical notices, updates, security alerts, and support
                messages
              </li>
              <li>Respond to your comments, questions, and requests</li>
              <li>
                Monitor and analyze trends, usage, and activities in connection
                with our services
              </li>
              <li>
                Detect, investigate, and prevent fraudulent transactions and
                other illegal activities
              </li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              3. Information Sharing
            </h2>
            <p>
              We do not sell, trade, or rent your personal information to third
              parties. We may share your information with:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-sm">
              <li>
                <strong>Service providers:</strong> Stripe (payments), PayPal
                (payments), Supabase (database), and other vendors who assist in
                our operations under confidentiality agreements
              </li>
              <li>
                <strong>Business transfers:</strong> In connection with a
                merger, acquisition, or sale of assets
              </li>
              <li>
                <strong>Legal requirements:</strong> When required by law or to
                protect our rights, property, or safety
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Data Retention</h2>
            <p>
              We retain your information for as long as your account is active
              or as needed to provide services. You may request deletion of your
              account and associated data at any time by contacting us at{" "}
              <a
                href="mailto:skdev@1commercesolutions.com"
                className="text-[#D4A843] hover:underline"
              >
                skdev@1commercesolutions.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Security</h2>
            <p>
              We implement industry-standard security measures including TLS
              encryption in transit, AES-256 encryption at rest, and regular
              security audits. Payment data is processed exclusively through
              PCI-DSS compliant processors (Stripe, PayPal) and is never stored
              on our servers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              6. Your Rights (CCPA / GDPR)
            </h2>
            <p>Depending on your location, you may have the right to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-sm">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data ("right to be forgotten")</li>
              <li>Object to or restrict processing of your data</li>
              <li>
                Data portability — receive your data in a machine-readable
                format
              </li>
              <li>
                Opt out of sale of personal information (we do not sell personal
                data)
              </li>
            </ul>
            <p className="mt-2">
              To exercise these rights, contact us at{" "}
              <a
                href="mailto:skdev@1commercesolutions.com"
                className="text-[#D4A843] hover:underline"
              >
                skdev@1commercesolutions.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Cookies</h2>
            <p>
              We use session cookies for authentication and analytics cookies
              (anonymized) to understand platform usage. You may disable cookies
              in your browser settings, though this may affect platform
              functionality.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              8. Children's Privacy
            </h2>
            <p>
              UnifyOne is not directed to children under 13. We do not knowingly
              collect personal information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              9. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will
              notify you of material changes by email or by posting a notice on
              the platform. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, please contact:
            </p>
            <div className="mt-2 text-sm space-y-1">
              <p>
                <strong>1Commerce LLC / PNW Enterprises</strong>
              </p>
              <p>
                Email:{" "}
                <a
                  href="mailto:skdev@1commercesolutions.com"
                  className="text-[#D4A843] hover:underline"
                >
                  skdev@1commercesolutions.com
                </a>
              </p>
              <p>Phone: +1 (406) 594-4343</p>
              <p>United States</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
