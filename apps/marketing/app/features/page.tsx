import type { Metadata } from "next";
import { Section, SectionHeader } from "@/components/ui/section";
import { Benefits } from "@/components/marketing/benefits";
import { CtaBand } from "@/components/marketing/cta-band";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Brain,
  ShoppingBag,
  Building2,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Features — GigIQ, Tax Autopilot, Kai & more",
  description:
    "Earnings intelligence, AI automation, multi-tenant commerce, and a personal AI sidekick — all in one platform.",
};

const CATEGORIES = [
  {
    icon: Sparkles,
    name: "Earnings Intelligence",
    blurb:
      "Real-time data from every gig app, store, and payment processor — normalized so you can finally compare.",
    items: [
      "GigIQ $/hour by platform, zone, and hour-of-day",
      "MoneyPulse forecasts, goals & variable-income budgeting",
      "Tax Autopilot with IRS-rate auto-mileage + quarterly estimates",
      "Exportable CSV/PDF reports for your CPA",
    ],
  },
  {
    icon: Brain,
    name: "AI & Automation",
    blurb:
      "Kai reads your actual data — not generic blog posts — and the UnifyAI Router gives you one billing line for every model.",
    items: [
      "Kai sidekick (Claude + GPT-4 backed) trained on your data",
      "UnifyAI Router: 300+ models behind one API key",
      "n8n + Zapier hooks for custom automations",
      "Per-tenant AI budgets and failover",
    ],
  },
  {
    icon: ShoppingBag,
    name: "1Commerce Engine",
    blurb:
      "If you sell products, run the whole commerce side without leaving UnifyOne. Multi-tenant ready from day one.",
    items: [
      "Hosted storefronts + custom domains (Cathedral)",
      "Stripe, PayPal, Square & Shopify Payments built in",
      "Affiliate program with auto-payouts",
      "Order fulfillment workflows",
    ],
  },
  {
    icon: Building2,
    name: "Multi-Tenant Governance",
    blurb:
      "Built for franchises, agencies, and holding companies. Isolation, roles, and audit trails done right.",
    items: [
      "Tenant isolation enforced at the data layer",
      "SSO + advanced role-based access (Cathedral)",
      "Cathedral Framework audit & rollback logs",
      "White-label branding & custom domains",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <>
      <Section tone="muted">
        <SectionHeader
          eyebrow="Features"
          title="Everything you need to run your money and your business."
          description="UnifyOne replaces a stack of disconnected tools — earnings tracking, taxes, AI, commerce, multi-tenant ops — with one platform that understands how operators actually work."
        />
      </Section>

      <Section tone="white">
        <div className="grid gap-6 md:grid-cols-2">
          {CATEGORIES.map(cat => (
            <Card key={cat.name}>
              <Badge>
                <cat.icon className="h-3 w-3" /> {cat.name}
              </Badge>
              <CardTitle className="mt-3">{cat.name}</CardTitle>
              <CardDescription>{cat.blurb}</CardDescription>
              <ul className="mt-5 space-y-2 text-sm text-ink-700">
                {cat.items.map(i => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                    {i}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </Section>

      {/* Kai highlight */}
      <Section tone="dark">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <Badge tone="brand">
              <Sparkles className="h-3 w-3" /> Kai · AI sidekick
            </Badge>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              An AI that knows your numbers — not just the internet.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-ink-500">
              Most “AI assistants” spit out generic advice. Kai answers from
              your real income, mileage, orders, and tenants — securely scoped
              to your account.
            </p>
            <ul className="mt-6 space-y-3 text-base text-ink-500">
              <li>• “Which gig shifts should I drop this month?”</li>
              <li>• “What are my Q3 estimated taxes?”</li>
              <li>• “Which Shopify SKUs are killing my margin?”</li>
              <li>• “Draft a refund email for order #4218.”</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-ink-700/40 p-6 shadow-lift">
            {/* TODO: replace with animated chat clip of Kai */}
            <div className="space-y-3 text-sm">
              <div className="rounded-xl bg-white/5 p-3 text-ink-500">
                You · Which DoorDash hours actually paid me $25+/hr last month?
              </div>
              <div className="rounded-xl bg-brand-600/90 p-3 text-white">
                Kai · Thursday and Friday 6–9 PM averaged $28.40/hr. Sunday
                mornings averaged $11.20/hr — I’d skip those.
              </div>
              <div className="rounded-xl bg-white/5 p-3 text-ink-500">
                You · What did I owe in Q2?
              </div>
              <div className="rounded-xl bg-brand-600/90 p-3 text-white">
                Kai · Estimated $1,247 federal + $310 state, after 2,310
                deductible miles. Export ready for your CPA?
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Benefits />

      <Section tone="muted">
        <SectionHeader
          eyebrow="Before & after"
          title="From 7 tabs to 1 dashboard"
        />
        <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
          <Card className="border-ink-900/10">
            <Badge tone="alert">Before UnifyOne</Badge>
            <ul className="mt-4 space-y-2 text-sm text-ink-700">
              <li>• 7 apps open, none of them agree on totals</li>
              <li>• Mileage tracked in Notes / forgotten</li>
              <li>• Tax surprises every quarter</li>
              <li>• AI invoices from 4 vendors</li>
              <li>• No clue which platform actually pays best</li>
            </ul>
          </Card>
          <Card className="border-growth-500/30">
            <Badge tone="growth">With UnifyOne</Badge>
            <ul className="mt-4 space-y-2 text-sm text-ink-700">
              <li>• One dashboard, all sources, in real time</li>
              <li>• Mileage tracked automatically at IRS rate</li>
              <li>• Quarterly estimates updated weekly</li>
              <li>• One AI bill, predictable & capped</li>
              <li>• Kai tells you exactly which shifts to drop</li>
            </ul>
          </Card>
        </div>
        <div className="mt-10 text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"
          >
            See pricing <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
