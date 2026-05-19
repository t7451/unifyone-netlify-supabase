import { Link } from "wouter";
import {
  Megaphone,
  Repeat2,
  Sparkles,
  Users2,
  CalendarClock,
  Rocket,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PageHead, { buildWebPageJsonLd } from "@/components/PageHead";
import { SITE_URL } from "@/lib/siteConfig";

const AFFILIATE_CANONICAL = `${SITE_URL}/affiliate-program`;

const SERVICES = [
  {
    id: "social-distribution",
    title: "Automated Social Distribution",
    description:
      "We publish and schedule high-performing short-form and long-form promo content across key social channels.",
    icon: Megaphone,
  },
  {
    id: "campaign-loops",
    title: "Creator Campaign Loops",
    description:
      "Automated repost and collaboration loops keep your affiliate message in front of new audiences every week.",
    icon: Repeat2,
  },
  {
    id: "ai-variations",
    title: "AI Content Variations",
    description:
      "We generate multiple ad-copy and creative angles to match each platform and creator niche.",
    icon: Sparkles,
  },
];

const BENEFITS = [
  "Earn recurring commissions for every qualified referral.",
  "Get campaign-ready social assets and posting calendars.",
  "Receive support for onboarding, messaging, and conversion.",
  "Scale your affiliate reach without manual posting every day.",
];

const STEPS = [
  {
    title: "Apply as a Creator Affiliate",
    description:
      "Sign up and tell us about your audience, platforms, and content style.",
    icon: Users2,
  },
  {
    title: "Launch Automated Campaigns",
    description:
      "We provide automation-backed social campaigns designed to increase awareness and clicks.",
    icon: CalendarClock,
  },
  {
    title: "Track Growth & Commissions",
    description:
      "Monitor your traffic, signups, and earnings while we keep distribution running.",
    icon: Rocket,
  },
];

export default function AffiliateLanding() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHead
        title="Affiliate Program | UnifyOne"
        description="Join the UnifyOne affiliate program and grow with automated social media marketing services that help creators reach more people and drive affiliate signups."
        canonical={AFFILIATE_CANONICAL}
        jsonLd={buildWebPageJsonLd({
          canonical: AFFILIATE_CANONICAL,
          name: "Affiliate Program | UnifyOne",
          description:
            "Automated social media marketing services to grow creator reach and affiliate signups.",
          breadcrumbs: [
            { name: "Affiliate Program", item: AFFILIATE_CANONICAL },
          ],
        })}
      />

      <section className="border-b border-border bg-card py-16">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="max-w-3xl space-y-6">
            <Badge variant="secondary">Creator Growth + Affiliate Revenue</Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Become a UnifyOne Affiliate and Grow with Automated Social
              Marketing
            </h1>
            <p className="text-lg text-muted-foreground">
              We help creators push UnifyOne to more people using automated
              social media marketing services—so you can focus on content while
              growing affiliate signups and commission revenue.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/signup">Become an Affiliate</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/contact">Talk to Our Growth Team</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="container mx-auto max-w-6xl px-4 space-y-6">
          <h2 className="text-2xl font-semibold">What We Automate for You</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {SERVICES.map(service => (
              <Card key={service.id}>
                <CardContent className="space-y-3 p-6">
                  <service.icon className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">{service.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {service.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-card/60 py-14">
        <div className="container mx-auto max-w-6xl px-4 grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">
              Why Creators Join This Program
            </h2>
            <p className="text-muted-foreground">
              This landing + service stack is built to expand your reach and
              convert attention into affiliate applications.
            </p>
          </div>
          <ul className="space-y-3">
            {BENEFITS.map(benefit => (
              <li
                key={benefit}
                className="rounded-md border border-border p-3 text-sm"
              >
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-14">
        <div className="container mx-auto max-w-6xl px-4 space-y-6">
          <h2 className="text-2xl font-semibold">How It Works</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <Card key={step.title}>
                <CardContent className="space-y-3 p-6">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                    {index + 1}
                  </div>
                  <step.icon className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
