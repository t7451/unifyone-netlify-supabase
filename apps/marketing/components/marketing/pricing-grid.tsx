import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { APP_URLS, cn } from "@/lib/utils";

export interface PricingTier {
  id: "acolyte" | "architect" | "cathedral";
  name: string;
  tagline: string;
  price: string;
  cadence?: string;
  features: string[];
  cta: { label: string; href: string };
  highlighted?: boolean;
}

export const TIERS: PricingTier[] = [
  {
    id: "acolyte",
    name: "Acolyte",
    tagline: "Get started — free forever",
    price: "$0",
    cadence: "/ month",
    features: [
      "1 tenant",
      "Connect 3 gig + commerce integrations",
      "GigIQ basics + MoneyPulse",
      "Kai AI sidekick (limited messages)",
      "Manual tax export",
      "Community support",
    ],
    cta: { label: "Start Free", href: APP_URLS.signup + "?plan=acolyte" },
  },
  {
    id: "architect",
    name: "Architect",
    tagline: "For serious operators & small teams",
    price: "$49",
    cadence: "/ month",
    features: [
      "Up to 5 tenants",
      "Unlimited integrations",
      "Full GigIQ + Tax Autopilot (auto-mileage)",
      "UnifyAI Router (one key for 300+ models)",
      "Kai unlimited + custom prompts",
      "Affiliate tools + storefronts",
      "Priority email support",
    ],
    cta: {
      label: "Start Free Trial",
      href: APP_URLS.signup + "?plan=architect",
    },
    highlighted: true,
  },
  {
    id: "cathedral",
    name: "Cathedral",
    tagline: "Agencies, franchises & holding companies",
    price: "$149",
    cadence: "/ month",
    features: [
      "Unlimited tenants",
      "White-label + custom domains",
      "SSO + advanced roles",
      "99.9% SLA + dedicated success manager",
      "Cathedral Framework governance",
      "Custom integrations on request",
    ],
    cta: { label: "Talk to Sales", href: "/contact?plan=cathedral" },
  },
];

export function PricingGrid({ compact = false }: { compact?: boolean }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {TIERS.map(t => (
        <div
          key={t.id}
          className={cn(
            "relative flex flex-col rounded-2xl border bg-white p-6 shadow-card transition",
            t.highlighted
              ? "border-brand-600 ring-2 ring-brand-600/20 shadow-lift"
              : "border-ink-900/10"
          )}
        >
          {t.highlighted && (
            <Badge tone="brand" className="absolute -top-3 left-6">
              Most popular
            </Badge>
          )}
          <h3 className="text-lg font-semibold text-ink-900">{t.name}</h3>
          <p className="mt-1 text-sm text-ink-500">{t.tagline}</p>

          <div className="mt-5 flex items-baseline gap-1">
            <span className="font-display text-4xl font-bold text-ink-900">
              {t.price}
            </span>
            {t.cadence && (
              <span className="text-sm text-ink-500">{t.cadence}</span>
            )}
          </div>

          {t.id === "acolyte" && (
            <p className="mt-2 text-xs font-semibold text-growth-600">
              No credit card required
            </p>
          )}

          <Button
            asChild
            size="lg"
            variant={t.highlighted ? "primary" : "secondary"}
            className="mt-6"
          >
            <a
              href={t.cta.href}
              data-analytics-cta={`pricing-${t.id}`}
              data-tier={t.id}
            >
              {t.cta.label}
            </a>
          </Button>

          {!compact && (
            <ul className="mt-6 space-y-3">
              {t.features.map(f => (
                <li
                  key={f}
                  className="flex items-start gap-2 text-sm text-ink-700"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-growth-500" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
