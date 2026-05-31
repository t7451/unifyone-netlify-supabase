import type { Metadata } from "next";
import { Section, SectionHeader } from "@/components/ui/section";
import { IntegrationsGrid } from "@/components/marketing/integrations-grid";
import { CtaBand } from "@/components/marketing/cta-band";

export const metadata: Metadata = {
  title: "Integrations — DoorDash, Shopify, Stripe & 12 more",
  description:
    "Connect every gig app, store, and payment processor you use. OAuth in once and let UnifyOne keep your data in sync.",
};

export default function IntegrationsPage() {
  return (
    <>
      <Section tone="muted">
        <SectionHeader
          eyebrow="Integrations"
          title="One OAuth. Everything in sync."
          description="From DoorDash to Stripe to Anthropic — UnifyOne pulls your real data continuously, with no spreadsheets and no copy-paste."
        />
      </Section>
      <Section tone="white">
        <IntegrationsGrid />
        <p className="mt-10 text-center text-sm text-ink-500">
          Need a custom integration?{" "}
          <a
            className="font-semibold text-brand-700 hover:underline"
            href="/contact"
          >
            Tell us what you use.
          </a>
        </p>
      </Section>
      <CtaBand
        title="Connect your first 3 platforms in under 5 minutes."
        subtitle="Free to start. We handle the OAuth dance for you."
      />
    </>
  );
}
