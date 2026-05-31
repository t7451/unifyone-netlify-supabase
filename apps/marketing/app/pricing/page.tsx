import type { Metadata } from "next";
import { Check, X } from "lucide-react";
import { Section, SectionHeader } from "@/components/ui/section";
import { PricingGrid, TIERS } from "@/components/marketing/pricing-grid";
import { FAQ } from "@/components/marketing/faq";
import { CtaBand } from "@/components/marketing/cta-band";

export const metadata: Metadata = {
  title: "Pricing — Free, $49, $149",
  description:
    "Start free on Acolyte. Upgrade to Architect ($49/mo) for full AI + 5 tenants, or Cathedral ($149/mo) for unlimited tenants and white-label.",
};

const MATRIX: {
  feature: string;
  tiers: [boolean | string, boolean | string, boolean | string];
}[] = [
  { feature: "Tenants", tiers: ["1", "5", "Unlimited"] },
  {
    feature: "Gig + commerce integrations",
    tiers: ["3", "Unlimited", "Unlimited"],
  },
  { feature: "GigIQ earnings intelligence", tiers: [true, true, true] },
  { feature: "MoneyPulse budgeting & forecasts", tiers: [true, true, true] },
  {
    feature: "Tax Autopilot (auto-mileage + estimates)",
    tiers: [false, true, true],
  },
  { feature: "Kai AI sidekick", tiers: ["Limited", "Unlimited", "Unlimited"] },
  {
    feature: "UnifyAI Router (one key, 300+ models)",
    tiers: [false, true, true],
  },
  { feature: "1Commerce Engine + storefronts", tiers: [false, true, true] },
  { feature: "Affiliate tools", tiers: [false, true, true] },
  { feature: "White-label + custom domains", tiers: [false, false, true] },
  { feature: "SSO + advanced roles", tiers: [false, false, true] },
  { feature: "99.9% SLA + dedicated CSM", tiers: [false, false, true] },
];

function Cell({ v }: { v: boolean | string }) {
  if (v === true)
    return (
      <Check
        className="mx-auto h-5 w-5 text-growth-500"
        aria-label="Included"
      />
    );
  if (v === false)
    return (
      <X
        className="mx-auto h-5 w-5 text-ink-500/40"
        aria-label="Not included"
      />
    );
  return <span className="text-sm font-medium text-ink-700">{v}</span>;
}

export default function PricingPage() {
  return (
    <>
      <Section tone="muted">
        <SectionHeader
          eyebrow="Pricing"
          title="Start free. Pay only when you grow."
          description="No setup fees, no hidden tenant charges. Cancel anytime — keep exporting your data."
        />
        <div className="mx-auto mt-12 max-w-6xl">
          <PricingGrid />
        </div>
      </Section>

      {/* Comparison table */}
      <Section tone="white">
        <SectionHeader eyebrow="Compare" title="What you get in each tier" />

        {/* Desktop / tablet table */}
        <div className="mx-auto mt-12 hidden max-w-5xl overflow-x-auto rounded-2xl border border-ink-900/10 md:block">
          <table className="w-full text-left">
            <thead className="bg-ink-900/[.03] text-xs font-semibold uppercase tracking-wider text-ink-500">
              <tr>
                <th className="px-5 py-4">Feature</th>
                {TIERS.map(t => (
                  <th key={t.id} className="px-5 py-4 text-center">
                    {t.name}
                    {t.highlighted && (
                      <span className="ml-2 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] text-white">
                        Popular
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-900/10 bg-white">
              {MATRIX.map(row => (
                <tr key={row.feature}>
                  <th
                    scope="row"
                    className="px-5 py-4 text-sm font-medium text-ink-900"
                  >
                    {row.feature}
                  </th>
                  {row.tiers.map((v, i) => (
                    <td key={i} className="px-5 py-4 text-center">
                      <Cell v={v} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile stacked cards */}
        <div className="mx-auto mt-12 grid max-w-md gap-5 md:hidden">
          {TIERS.map((t, tierIdx) => (
            <div
              key={t.id}
              className={
                "rounded-2xl border bg-white p-5 shadow-card " +
                (t.highlighted
                  ? "border-brand-600 ring-2 ring-brand-600/20"
                  : "border-ink-900/10")
              }
            >
              <div className="flex items-baseline justify-between">
                <h3 className="text-base font-bold text-ink-900">{t.name}</h3>
                <p className="text-sm font-semibold text-ink-700">
                  {t.price}
                  <span className="text-xs font-normal text-ink-500">
                    {t.cadence}
                  </span>
                </p>
              </div>
              <ul className="mt-4 divide-y divide-ink-900/5 text-sm">
                {MATRIX.map(row => (
                  <li
                    key={row.feature}
                    className="flex items-center justify-between py-2"
                  >
                    <span className="pr-3 text-ink-700">{row.feature}</span>
                    <span className="shrink-0">
                      <Cell v={row.tiers[tierIdx]} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <FAQ
        eyebrow="Billing FAQ"
        title="The fine print, in plain English"
        items={[
          {
            q: "Do tenants cost extra?",
            a: "No per-tenant charges within your tier. Acolyte = 1, Architect = 5, Cathedral = unlimited. If you need 6+ on Architect, upgrade to Cathedral.",
          },
          {
            q: "Can I white-label my client-facing storefronts?",
            a: "Yes — Cathedral includes white-label, custom domains, and removal of all UnifyOne branding. Architect keeps the ‘powered by UnifyOne’ mark.",
          },
          {
            q: "How does the UnifyAI Router billing work?",
            a: "One predictable monthly cap with metered overage at cost. Replace 5+ vendor invoices with one line. Failover and per-tenant budgets included.",
          },
          {
            q: "Can I cancel anytime?",
            a: "Yes. Cancel in dashboard at any time. We keep your data exportable for 90 days after cancellation.",
          },
          {
            q: "Do you offer nonprofit / student pricing?",
            a: "Yes — email hello@1commerce.online with verification and we’ll apply a 40% discount.",
          },
        ]}
      />

      <CtaBand
        title="Try Acolyte free. See your real numbers tonight."
        subtitle="No card, no setup call required. Most users connect their first 3 platforms in under 5 minutes."
      />
    </>
  );
}
