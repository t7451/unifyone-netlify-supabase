export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Terms of Service</h1>
          <p className="text-muted-foreground text-sm">UnifyOne Commerce Platform · 1Commerce LLC · Last updated: March 2026</p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using UnifyOne Commerce Platform ("Service"), operated by 1Commerce LLC / PNW Enterprises ("Company," "we," "us"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
            <p>UnifyOne is a multi-tenant SaaS commerce platform that provides tools for inventory management, order processing, customer management, payment processing (via Stripe and PayPal), social media management, and e-commerce integrations including Shopify and n8n automation workflows.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Account Registration</h2>
            <p>You must create an account to use the Service. You are responsible for:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-sm">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Providing accurate and complete registration information</li>
              <li>Promptly notifying us of any unauthorized use of your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Subscription and Payment</h2>
            <p>The Service is offered on a subscription basis. By subscribing, you agree to pay the applicable fees. Subscriptions auto-renew unless cancelled before the renewal date. Refunds are handled on a case-by-case basis — contact <a href="mailto:skdev@1commercesolutions.com" className="text-[#00D9FF] hover:underline">skdev@1commercesolutions.com</a>.</p>
            <p className="mt-2">Payment processing is handled by Stripe and PayPal. By providing payment information, you agree to their respective terms of service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Promote & Earn Program</h2>
            <p>The Promote & Earn referral program allows users to earn credits by sharing UnifyOne on social media and referring new users. Credits are:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-sm">
              <li>Non-transferable and have no cash value outside of subscription credits</li>
              <li>Applied as discounts against future subscription invoices only</li>
              <li>Subject to a minimum redemption of 100 credits ($1.00)</li>
              <li>Forfeited upon account termination</li>
            </ul>
            <p className="mt-2">All promotional content must include FTC-required disclosure language. Fraudulent referrals (self-referrals, fake accounts) will result in credit forfeiture and possible account termination.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-sm">
              <li>Use the Service for any unlawful purpose or in violation of any regulations</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Transmit malicious code, viruses, or harmful data</li>
              <li>Scrape, crawl, or extract data from the Service without authorization</li>
              <li>Resell or sublicense the Service without written permission</li>
              <li>Use the Service to process transactions for illegal goods or services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Data Ownership</h2>
            <p>You retain ownership of all data you input into the Service (products, orders, customer records). We do not claim ownership of your data. You grant us a limited license to process your data solely to provide the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Service Availability</h2>
            <p>We strive for 99.9% uptime but do not guarantee uninterrupted access. We may perform maintenance with advance notice when possible. We are not liable for downtime caused by third-party services (Stripe, PayPal, Shopify, Supabase).</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Limitation of Liability</h2>
            <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE COMPANY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR BUSINESS INTERRUPTION, ARISING FROM YOUR USE OF THE SERVICE.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Termination</h2>
            <p>Either party may terminate this agreement at any time. Upon termination, your access to the Service will cease. You may export your data within 30 days of termination. After 30 days, we may delete your data.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Governing Law</h2>
            <p>These Terms are governed by the laws of the State of Oregon, United States, without regard to conflict of law principles. Disputes shall be resolved in the courts of Multnomah County, Oregon.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Contact</h2>
            <div className="text-sm space-y-1">
              <p><strong>1Commerce LLC / PNW Enterprises</strong></p>
              <p>Email: <a href="mailto:skdev@1commercesolutions.com" className="text-[#00D9FF] hover:underline">skdev@1commercesolutions.com</a></p>
              <p>Phone: +1 (406) 594-4343</p>
              <p>United States</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
