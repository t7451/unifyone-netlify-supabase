import { Plug, LineChart, Brain, Rocket } from "lucide-react";
import { Section, SectionHeader } from "@/components/ui/section";

const STEPS = [
  {
    icon: Plug,
    title: "1. Connect in 2 minutes",
    body: "OAuth into DoorDash, Uber Eats, Instacart, Amazon Flex, Shopify, Stripe, PayPal, Square — whatever you use.",
  },
  {
    icon: LineChart,
    title: "2. See the truth",
    body: "GigIQ + MoneyPulse normalize earnings across platforms. See $/hour, top zones, hidden costs, and tax owed in real time.",
  },
  {
    icon: Brain,
    title: "3. Ask Kai",
    body: "Your in-house AI sidekick reads your actual data: ‘Which shifts should I drop?’ ‘What did I owe Q2?’",
  },
  {
    icon: Rocket,
    title: "4. Automate & scale",
    body: "Add tenants, white-label storefronts, automate fulfillment, and route AI calls through one billing line.",
  },
];

export function HowItWorks() {
  return (
    <Section>
      <SectionHeader
        eyebrow="How it works"
        title="From scattered apps to one source of truth"
        description="Most operators lose hours every week reconciling platforms. UnifyOne does it automatically — and tells you what to do next."
      />

      <ol className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(s => (
          <li
            key={s.title}
            className="group relative rounded-2xl border border-ink-900/10 bg-white p-6 shadow-card transition hover:shadow-lift"
          >
            <span className="inline-grid h-11 w-11 place-items-center rounded-xl bg-brand-600 text-white">
              <s.icon className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-base font-semibold text-ink-900">
              {s.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">
              {s.body}
            </p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
