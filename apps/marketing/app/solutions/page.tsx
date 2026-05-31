import type { Metadata } from "next";
import { Section, SectionHeader } from "@/components/ui/section";
import { CtaBand } from "@/components/marketing/cta-band";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, Store, Building2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Solutions — Gig workers, sellers & agencies",
  description:
    "Built for the way you actually operate, whether you’re solo on DoorDash or running 50 white-label storefronts.",
};

const SOLUTIONS = [
  {
    id: "gig",
    icon: Truck,
    name: "For gig workers & side-hustle operators",
    blurb:
      "Stop guessing which app, hour, or zone actually pays. Track every dollar, every mile, every tax obligation — and let Kai tell you what to do next.",
    bullets: [
      "Connect DoorDash, Uber Eats, Instacart, Amazon Flex & more in minutes",
      "Auto-mileage tracking at IRS rate (no manual logs)",
      "Quarterly tax estimates updated weekly",
      "Kai answers: ‘Which shifts should I drop?’",
    ],
  },
  {
    id: "ecom",
    icon: Store,
    name: "For e-commerce sellers",
    blurb:
      "Unify orders, payments, and margins across Shopify, Stripe, PayPal, Square. Catch the SKUs killing your bottom line before next quarter.",
    bullets: [
      "Real margin reports across every channel",
      "Refund + dispute tracking in one inbox",
      "Affiliate tools with auto-payouts",
      "Fulfillment workflows via ShipStation, n8n, Zapier",
    ],
  },
  {
    id: "agencies",
    icon: Building2,
    name: "For agencies & multi-tenant operators",
    blurb:
      "Run dozens of franchise locations, white-label client storefronts, or portfolio brands with proper isolation and one billing line for AI.",
    bullets: [
      "Unlimited tenants on Cathedral",
      "White-label, custom domains, SSO + advanced roles",
      "UnifyAI Router: one key for Claude, GPT-4, Gemini, +300",
      "Cathedral Framework audit logs + rollback",
    ],
  },
];

export default function SolutionsPage() {
  return (
    <>
      <Section tone="muted">
        <SectionHeader
          eyebrow="Solutions"
          title="Built for the way you actually work."
          description="Pick your starting point. UnifyOne grows from a single gig worker dashboard all the way to a multi-tenant agency platform."
        />
      </Section>

      <Section tone="white">
        <div className="grid gap-10">
          {SOLUTIONS.map(s => (
            <Card key={s.id} id={s.id} className="lg:flex lg:gap-10">
              <div className="lg:w-1/3">
                <Badge>
                  <s.icon className="h-3 w-3" />{" "}
                  {s.name.split(" ").slice(0, 2).join(" ")}
                </Badge>
                <CardTitle className="mt-3 text-2xl">{s.name}</CardTitle>
                <CardDescription>{s.blurb}</CardDescription>
              </div>
              <ul className="mt-6 grid flex-1 gap-3 sm:grid-cols-2 lg:mt-0">
                {s.bullets.map(b => (
                  <li
                    key={b}
                    className="rounded-xl border border-ink-900/10 bg-white p-4 text-sm text-ink-700"
                  >
                    {b}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
