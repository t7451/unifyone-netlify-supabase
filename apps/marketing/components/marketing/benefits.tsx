import {
  BarChart3,
  Receipt,
  Bot,
  Building2,
  Wallet,
  ShoppingBag,
} from "lucide-react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Section, SectionHeader } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";

const BENEFITS = [
  {
    icon: BarChart3,
    badge: "Earnings intelligence",
    title: "GigIQ — see which hours and zones actually pay",
    body: "Normalized $/hour across DoorDash, Uber Eats, Instacart, Amazon Flex and more. Stop guessing which platform is worth your time.",
  },
  {
    icon: Receipt,
    badge: "Tax Autopilot",
    title: "Auto-mileage at IRS rate + quarterly estimates",
    body: "We track every drive, calculate deductions, and project your quarterly taxes — exportable for your CPA in one click.",
  },
  {
    icon: Bot,
    badge: "Kai · AI sidekick",
    title: "An AI that reads your real data, not generic tips",
    body: "Ask ‘Which shifts should I drop?’ or ‘What did I owe Q2?’ — Kai answers from your actual income, mileage, and orders.",
  },
  {
    icon: Wallet,
    badge: "MoneyPulse",
    title: "Budget and forecast tied to real income",
    body: "Stop using personal-finance apps that don’t understand variable income. Goals and forecasts that match the way you actually earn.",
  },
  {
    icon: ShoppingBag,
    badge: "1Commerce Engine",
    title: "Storefronts, affiliates, and fulfillment built in",
    body: "If you also sell products, run the whole commerce side from the same platform — multi-tenant ready from day one.",
  },
  {
    icon: Building2,
    badge: "UnifyAI Router",
    title: "One API key for Claude, GPT-4, Gemini + 300 more",
    body: "Predictable billing, automatic failover, and zero vendor lock-in. Perfect for agencies running AI features for clients.",
  },
];

export function Benefits() {
  return (
    <Section tone="white">
      <SectionHeader
        eyebrow="Built for real operators"
        title="Six things you stop doing manually today"
        description="UnifyOne replaces a stack of disconnected tools with one platform that actually understands how you make money."
      />

      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {BENEFITS.map(b => (
          <Card key={b.title} className="flex flex-col">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700">
              <b.icon className="h-5 w-5" />
            </span>
            <Badge className="mt-4 w-fit" tone="brand">
              {b.badge}
            </Badge>
            <CardTitle className="mt-3">{b.title}</CardTitle>
            <CardDescription>{b.body}</CardDescription>
          </Card>
        ))}
      </div>
    </Section>
  );
}
