import { Hero } from "@/components/marketing/hero";
import { TrustBar } from "@/components/marketing/trust-bar";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Benefits } from "@/components/marketing/benefits";
import { Testimonials } from "@/components/marketing/testimonials";
import { Section, SectionHeader } from "@/components/ui/section";
import { IntegrationsGrid } from "@/components/marketing/integrations-grid";
import { PricingGrid } from "@/components/marketing/pricing-grid";
import { FAQ } from "@/components/marketing/faq";
import { CtaBand } from "@/components/marketing/cta-band";
import { DemoEmbed } from "@/components/marketing/demo-embed";

export default function HomePage() {
  return (
    <>
      <Hero />
      <TrustBar />
      <Testimonials />
      <HowItWorks />
      <Benefits />

      {/* Dashboard preview / demo video section */}
      <Section id="demo" tone="dark">
        <SectionHeader
          eyebrow="See it in motion"
          title={
            <span className="text-white">
              Your data, finally telling you something useful.
            </span>
          }
          description={
            <span className="text-ink-500">
              A 60-second look at GigIQ, Tax Autopilot, and Kai answering real
              questions from real data.
            </span>
          }
        />
        <div className="mx-auto mt-12 aspect-video w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-ink-700 shadow-lift">
          <DemoEmbed />
        </div>
      </Section>

      <Section tone="white">
        <SectionHeader
          eyebrow="Integrations"
          title="Connects to what you already use"
          description="OAuth in once. We keep the data flowing — no spreadsheets, no copy-paste."
        />
        <div className="mt-12">
          <IntegrationsGrid />
        </div>
      </Section>

      <Section tone="muted">
        <SectionHeader
          eyebrow="Pricing"
          title="Free to start. Honest as you scale."
          description="Start on Acolyte free forever. Upgrade only when your tenants, revenue, or team grow."
        />
        <div className="mx-auto mt-12 max-w-6xl">
          <PricingGrid compact />
        </div>
      </Section>

      <FAQ
        items={[
          {
            q: "Is UnifyOne really free?",
            a: "Yes. The Acolyte tier is free forever for 1 tenant with core GigIQ, MoneyPulse, and 3 integrations. No credit card required.",
          },
          {
            q: "Which gig platforms do you support?",
            a: "DoorDash, Uber Eats, Instacart, Amazon Flex, Grubhub, and Spark today — with more added monthly. See our Integrations page for the full list.",
          },
          {
            q: "Is my financial data secure?",
            a: "All credentials are encrypted at rest, OAuth tokens are stored in isolated tenant vaults, and we never sell or share your data. Built on the Cathedral Framework with SOC-2-ready controls.",
          },
          {
            q: "Do I have to use the commerce features?",
            a: "Not at all. Many gig-only users never touch the 1Commerce Engine. Multi-tenant storefronts are there if you grow into them.",
          },
        ]}
      />

      <CtaBand />
    </>
  );
}
