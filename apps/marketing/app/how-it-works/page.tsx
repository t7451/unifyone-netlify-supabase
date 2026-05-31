import type { Metadata } from "next";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { CtaBand } from "@/components/marketing/cta-band";
import { Section, SectionHeader } from "@/components/ui/section";

export const metadata: Metadata = {
  title: "How it works — From scattered apps to one dashboard",
  description:
    "Connect, see, ask Kai, automate. A 4-step path from chaos to clarity for gig workers and operators.",
};

export default function HowItWorksPage() {
  return (
    <>
      <Section tone="muted">
        <SectionHeader
          eyebrow="How it works"
          title="From scattered apps to one source of truth"
          description="Most operators waste hours every week reconciling platforms. UnifyOne does it automatically — and tells you what to do next."
        />
      </Section>

      <HowItWorks />

      <Section tone="white">
        <SectionHeader
          eyebrow="What changes in week 1"
          title="The wins most people see in their first 7 days"
        />
        <ul className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2">
          {[
            "Identify the lowest-paying shifts you’re still doing",
            "First mileage report ready for tax season",
            "One AI bill instead of 4",
            "Tenant-level dashboards for every client / brand",
            "Kai answers your first 10 ‘what if’ questions",
            "Refund + dispute pile-up cleared",
          ].map(b => (
            <li
              key={b}
              className="rounded-xl border border-ink-900/10 bg-white p-4 text-sm text-ink-700"
            >
              {b}
            </li>
          ))}
        </ul>
      </Section>

      <CtaBand />
    </>
  );
}
