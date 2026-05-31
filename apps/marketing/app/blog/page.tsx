import type { Metadata } from "next";
import Link from "next/link";
import { Section, SectionHeader } from "@/components/ui/section";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Blog — Earnings, taxes & operator playbooks",
  description:
    "Tactical posts on maximizing gig earnings, tax automation, AI for operators, and multi-tenant commerce.",
};

// TODO: Replace with a real MDX/CMS pipeline (e.g., Contentlayer, Sanity, or local MDX).
const POSTS = [
  {
    slug: "doordash-zones-that-actually-pay",
    title: "The 5 DoorDash zone patterns that actually pay in 2026",
    excerpt:
      "We analyzed 1,200+ operators’ GigIQ data. The patterns are not what TikTok says.",
    category: "GigIQ",
    readTime: "6 min read",
  },
  {
    slug: "quarterly-taxes-in-20-minutes",
    title: "How to file quarterly taxes in 20 minutes (with Tax Autopilot)",
    excerpt:
      "A step-by-step walkthrough using the new Tax Autopilot export and your CPA workflow.",
    category: "Tax Autopilot",
    readTime: "8 min read",
  },
  {
    slug: "one-api-key-for-all-ai",
    title: "Why agencies are killing per-vendor AI invoices in 2026",
    excerpt:
      "Predictable billing, automatic failover, and per-tenant budgets with the UnifyAI Router.",
    category: "UnifyAI",
    readTime: "5 min read",
  },
];

export default function BlogPage() {
  return (
    <>
      <Section tone="muted">
        <SectionHeader
          eyebrow="Resources"
          title="Operator playbooks, not generic blog noise"
          description="Practical posts from our team and customers — earnings tactics, tax automation, AI workflows, and agency growth."
        />
      </Section>

      <Section tone="white">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {POSTS.map(p => (
            <Link key={p.slug} href={`/blog/${p.slug}`}>
              <Card className="h-full">
                <Badge tone="brand">{p.category}</Badge>
                <CardTitle className="mt-3">{p.title}</CardTitle>
                <CardDescription>{p.excerpt}</CardDescription>
                <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  {p.readTime}
                </p>
              </Card>
            </Link>
          ))}
        </div>

        {/* Lead magnet */}
        <div className="mt-16 rounded-2xl border border-brand-200 bg-brand-50/40 p-8 sm:p-10">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <Badge tone="growth">Free download</Badge>
              <h3 className="mt-3 font-display text-2xl font-bold text-ink-900">
                The Gig Earnings Optimization Checklist
              </h3>
              <p className="mt-2 max-w-2xl text-ink-500">
                A 1-page PDF of the 12 highest-impact moves to add $300–$800 to
                your monthly gig income, ranked by effort.
              </p>
            </div>
            {/* TODO(integration): wire /api/lead to Resend / Loops / ConvertKit. */}
            <form
              className="flex flex-col gap-2 sm:flex-row"
              action="/api/lead"
              method="post"
              data-analytics-form="lead-checklist"
            >
              <input
                type="email"
                name="email"
                required
                aria-label="Email"
                placeholder="you@example.com"
                className="h-12 rounded-lg border border-ink-900/15 bg-white px-4 text-sm focus:border-brand-500 focus:outline-none"
              />
              <button
                type="submit"
                data-analytics-cta="lead-checklist"
                className="h-12 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Get the checklist
              </button>
            </form>
          </div>
        </div>
      </Section>
    </>
  );
}
