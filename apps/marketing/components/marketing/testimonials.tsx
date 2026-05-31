import { Star, TrendingUp, Users, DollarSign } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Section, SectionHeader } from "@/components/ui/section";

/**
 * TODO(real-content): Replace placeholder testimonials with real customer
 * quotes + headshots once collected via post-30-day Typeform → Notion CMS.
 */
const TESTIMONIALS = [
  {
    quote:
      "I dropped my worst-paying shifts the week I signed up and made about $430 more that month — same hours. GigIQ paid for itself in 3 days.",
    name: "Maya R.",
    role: "DoorDash + Instacart driver · Austin, TX",
    avatar: "MR",
    metric: "+$430/mo",
  },
  {
    quote:
      "Finally one dashboard instead of seven. My accountant loves the Tax Autopilot export — quarterlies took 20 minutes instead of half a Sunday.",
    name: "Devin K.",
    role: "Shopify + Stripe seller · Portland, OR",
    avatar: "DK",
    metric: "20 min taxes",
  },
  {
    quote:
      "We run 14 white-label tenants for franchise clients on Cathedral. The AI Router alone replaced 4 separate vendor invoices.",
    name: "Priya S.",
    role: "Founder · Northstar Agency",
    avatar: "PS",
    metric: "14 tenants",
  },
];

const STATS = [
  { icon: Users, value: "1,200+", label: "Operators onboarded" },
  { icon: DollarSign, value: "$2.3M+", label: "Earnings tracked monthly" },
  { icon: TrendingUp, value: "+18%", label: "Avg. earnings lift in 30 days" },
];

export function Testimonials() {
  return (
    <Section tone="muted">
      <SectionHeader
        eyebrow="Why operators stay"
        title="Real money. Real results. Real fast."
        description="From solo gig drivers to multi-tenant agencies — here’s what changes once UnifyOne is doing the math for you."
      />

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {TESTIMONIALS.map(t => (
          <Card key={t.name} className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex gap-0.5 text-amber-400" aria-label="5 stars">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <span className="rounded-full bg-growth-500/10 px-2 py-0.5 text-xs font-bold text-growth-600">
                {t.metric}
              </span>
            </div>
            <p className="text-base leading-relaxed text-ink-700">
              “{t.quote}”
            </p>
            <div className="mt-auto flex items-center gap-3 pt-2">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                {t.avatar}
              </span>
              <div>
                <p className="text-sm font-semibold text-ink-900">{t.name}</p>
                <p className="text-xs text-ink-500">{t.role}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mx-auto mt-12 grid max-w-4xl gap-4 rounded-2xl border border-ink-900/10 bg-white p-6 shadow-card sm:grid-cols-3 sm:divide-x sm:divide-ink-900/10">
        {STATS.map(s => (
          <div
            key={s.label}
            className="flex items-center gap-3 sm:px-6 sm:first:pl-0 sm:last:pr-0"
          >
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-700">
              <s.icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xl font-bold text-ink-900">{s.value}</p>
              <p className="text-xs text-ink-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
