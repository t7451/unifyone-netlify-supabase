import { trpc } from "@/lib/trpc";
import {
  DEALFLOW_APP_URL,
  DEALFLOW_BEST_BANKING_URL,
  DEALFLOW_BLOG_URL,
} from "@/lib/dealflow";
import { PLAN_CATALOG_BY_SLUG, formatUsdCents } from "@shared/pricing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeDollarSign,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Crosshair,
  ExternalLink,
  Flame,
  Megaphone,
  Rocket,
  Route,
  Target,
  Users,
  Workflow,
} from "lucide-react";
import { Link } from "wouter";

const MRR_TARGET = 10000;

function money(value: number): string {
  return `$${value.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
}

export default function RevenueCommand() {
  const leadsStats = trpc.leads.stats.useQuery();
  const revenueSummary = trpc.revenueStreams.getSummary.useQuery();
  const affiliateSummary = trpc.affiliates.getSummary.useQuery();
  const subscriptionStatus = trpc.subscription.getStatus.useQuery();

  const monthlyRevenue = Number(revenueSummary.data?.totalMonthly ?? 0);
  const affiliateRevenue = Number(affiliateSummary.data?.totalMonthly ?? 0);
  const mrrProgress = Math.min(
    100,
    Math.round((monthlyRevenue / MRR_TARGET) * 100)
  );
  const currentPlan = subscriptionStatus.data?.plan?.name ?? "No paid plan";
  const paidPlans = [PLAN_CATALOG_BY_SLUG.pro, PLAN_CATALOG_BY_SLUG.scale];

  const funnelStages = [
    {
      title: "Acquire",
      body: "Use DealFlow and high-intent content to catch referral, bonus, and operator search demand.",
      icon: Target,
      href: "/dashboard/dealflow",
      label: "Open DealFlow",
    },
    {
      title: "Qualify",
      body: "Route serious operators into the lead pipeline, score intent, and move them toward the right offer.",
      icon: Users,
      href: "/leads",
      label: "Open Leads",
    },
    {
      title: "Monetize",
      body: "Track affiliate programs, SaaS plans, consulting retainers, and DealFlow payouts as one portfolio.",
      icon: CircleDollarSign,
      href: "/revenue-streams",
      label: "Open Streams",
    },
    {
      title: "Automate",
      body: "Turn clicks, forms, and conversions into follow-up workflows, notifications, and campaign loops.",
      icon: Workflow,
      href: "/automations",
      label: "Open Automations",
    },
  ] as const;

  const launchTasks = [
    {
      task: "Seed DealFlow as a tracked revenue stream",
      href: "/revenue-streams?preset=dealflow",
      owner: "Revenue Streams",
      icon: BadgeDollarSign,
      external: false,
    },
    {
      task: "Review banking bonus page and replace weak offers",
      href: DEALFLOW_BEST_BANKING_URL,
      owner: "DealFlow",
      icon: ExternalLink,
      external: true,
    },
    {
      task: "Publish one conversion blog tied to an offer category",
      href: DEALFLOW_BLOG_URL,
      owner: "Content",
      icon: Megaphone,
      external: true,
    },
    {
      task: "Move qualified operators into Pro or Scale follow-up",
      href: "/leads?status=qualified",
      owner: "Leads",
      icon: Crosshair,
      external: false,
    },
  ] as const;

  const monetizationOffers = [
    {
      name: "DealFlow Affiliate Engine",
      price: "Tracked by payout",
      body: "Referral and bonus revenue from 1commerce.world, especially high-intent category pages.",
      href: DEALFLOW_APP_URL,
      external: true,
    },
    ...paidPlans.map(plan => ({
      name: `UnifyOne ${plan.name}`,
      price: `${formatUsdCents(plan.monthlyPriceCents)}/mo`,
      body: plan.description,
      href: `/checkout?plan=${plan.slug}`,
      external: false,
    })),
    {
      name: "Concierge Setup",
      price: "$750-$3,000",
      body: "One-time onboarding and automation setup fees to generate cash while recurring revenue ramps.",
      href: "/leads",
      external: false,
    },
  ] as const;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              Revenue Push
            </Badge>
            <Badge variant="secondary">DealFlow + UnifyOne</Badge>
            <Badge variant="outline">30-day command loop</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Rocket className="h-6 w-6 text-primary" /> Revenue Command
          </h1>
          <p className="text-muted-foreground text-sm mt-2 max-w-3xl leading-6">
            A single operating view for the revenue boost architecture: DealFlow
            acquires intent, UnifyOne qualifies the operator, revenue modules
            track the money, and automations keep the follow-up moving.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/dashboard/dealflow">
              Open DealFlow Hub <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/revenue-streams?preset=dealflow">
              Track DealFlow Stream
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              Tracked Monthly Revenue
            </p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {money(monthlyRevenue)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {mrrProgress}% of {money(MRR_TARGET)} MRR target
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Lead Pipeline</p>
            <p className="text-2xl font-bold mt-1">
              {leadsStats.data?.total ?? 0}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {leadsStats.data?.qualified ?? 0} qualified /{" "}
              {leadsStats.data?.converted ?? 0} converted
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Affiliate Monthly</p>
            <p className="text-2xl font-bold text-teal-400 mt-1">
              {money(affiliateRevenue)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {affiliateSummary.data?.activeCount ?? 0} active programs
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Current Tenant Plan</p>
            <p className="text-2xl font-bold mt-1">{currentPlan}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Status: {subscriptionStatus.data?.status ?? "none"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="h-4 w-4" /> Revenue Architecture
            </CardTitle>
            <CardDescription>
              Keep each system in its lane and move prospects through the loop.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {funnelStages.map(stage => {
              const Icon = stage.icon;
              return (
                <div
                  key={stage.title}
                  className="rounded-xl border border-border bg-background/50 p-4 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <p className="font-medium">{stage.title}</p>
                  </div>
                  <p className="text-sm text-muted-foreground leading-6">
                    {stage.body}
                  </p>
                  <Button asChild variant="outline" className="w-full">
                    <Link href={stage.href}>{stage.label}</Link>
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-primary" /> This Week's Push
            </CardTitle>
            <CardDescription>
              Small actions that turn the architecture into active revenue work.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {launchTasks.map(item => {
              const Icon = item.icon;
              const content = (
                <>
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-5">
                        {item.task}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.owner}
                      </p>
                    </div>
                    {item.external ? (
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </>
              );

              return item.external ? (
                <a
                  key={item.task}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-xl border border-border bg-background/60 p-3 hover:bg-background transition-colors"
                >
                  {content}
                </a>
              ) : (
                <Link
                  key={item.task}
                  href={item.href}
                  className="block rounded-xl border border-border bg-background/60 p-3 hover:bg-background transition-colors"
                >
                  {content}
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BadgeDollarSign className="h-4 w-4" /> Monetization Stack
          </CardTitle>
          <CardDescription>
            The offers that should be presented as prospects move through the
            loop.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {monetizationOffers.map(offer => (
            <div
              key={offer.name}
              className="rounded-xl border border-border bg-background/50 p-4 space-y-3"
            >
              <div>
                <p className="font-medium">{offer.name}</p>
                <p className="text-lg font-bold text-primary mt-1">
                  {offer.price}
                </p>
              </div>
              <p className="text-sm text-muted-foreground leading-6">
                {offer.body}
              </p>
              <Button asChild variant="outline" className="w-full">
                {offer.external ? (
                  <a href={offer.href} target="_blank" rel="noreferrer">
                    Open <ArrowUpRight className="h-4 w-4" />
                  </a>
                ) : (
                  <Link href={offer.href}>
                    Open <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-4 w-4" /> Operating Rules
          </CardTitle>
          <CardDescription>
            Use these rules to keep the push narrow enough to ship and sell this
            month.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
          {[
            "Every DealFlow page needs a tracked offer, a next step, and a destination in UnifyOne.",
            "Every qualified lead gets a Pro or Scale path plus a setup-fee option.",
            "Every active revenue source must live in Revenue Streams so MRR progress is visible daily.",
          ].map(rule => (
            <div
              key={rule}
              className="flex gap-3 rounded-xl border border-border bg-background/50 p-4 leading-6"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-1" />
              <span>{rule}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock3 className="h-3.5 w-3.5" />
        Review this page daily while the revenue push is active.
      </div>
    </div>
  );
}
