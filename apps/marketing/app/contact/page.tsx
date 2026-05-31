import type { Metadata } from "next";
import { Section, SectionHeader } from "@/components/ui/section";
import { ContactForm } from "@/components/marketing/contact-form";

export const metadata: Metadata = {
  title: "Contact sales — Cathedral & enterprise",
  description:
    "Talk to our team about Cathedral, white-label, SSO, custom integrations, or enterprise SLAs.",
};

export default function ContactPage() {
  return (
    <Section tone="muted">
      <div className="grid gap-12 lg:grid-cols-2">
        <div>
          <SectionHeader
            center={false}
            eyebrow="Contact"
            title="Talk to a human."
            description="We typically respond within 1 business day. For account help, log in and message us in-app for faster service."
          />
          <ul className="mt-8 space-y-3 text-sm text-ink-700">
            <li>• hello@1commerce.online</li>
            <li>• Sales (Cathedral): sales@1commerce.online</li>
            <li>• Security disclosures: security@1commerce.online</li>
          </ul>
        </div>
        <ContactForm />
      </div>
    </Section>
  );
}
