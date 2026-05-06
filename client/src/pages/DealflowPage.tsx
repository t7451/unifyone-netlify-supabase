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
  ArrowUpRight,
  BadgeDollarSign,
  ExternalLink,
  Globe,
  Lock,
  Megaphone,
  Rocket,
  SearchCheck,
  Shield,
  Sparkles,
  Workflow,
} from "lucide-react";
import { Link } from "wouter";
import {
  DEALFLOW_ADMIN_URL,
  DEALFLOW_APP_URL,
  DEALFLOW_BEST_BANKING_URL,
  DEALFLOW_BLOG_URL,
  DEALFLOW_DASHBOARD_URL,
  DEALFLOW_EMBED_NOTE,
  DEALFLOW_REPO_URL,
} from "@/lib/dealflow";

export default function DealflowPage() {
  const launchSurfaces = [
    {
      title: "Live Site",
      description:
        "Public acquisition engine for referral offers, bonus pages, collections, and SEO traffic.",
      href: DEALFLOW_APP_URL,
      label: "Open 1commerce.world",
      badge: "Live",
      icon: Globe,
    },
    {
      title: "Admin",
      description:
        "Deal CRUD, blog management, analytics, and operational controls inside DealFlow.",
      href: DEALFLOW_ADMIN_URL,
      label: "Open Admin",
      badge: "Netlify Identity",
      icon: Lock,
    },
    {
      title: "Dashboard",
      description:
        "Protected dashboard surface for managing the live DealFlow site outside this repo.",
      href: DEALFLOW_DASHBOARD_URL,
      label: "Open Dashboard",
      badge: "Protected",
      icon: Workflow,
    },
    {
      title: "Source Repo",
      description:
        "Standalone Vite/React codebase for the live app, useful for direct iteration and deployment work.",
      href: DEALFLOW_REPO_URL,
      label: "Open GitHub Repo",
      badge: "Source",
      icon: ExternalLink,
    },
  ] as const;

  const revenueRoles = [
    {
      title: "Search Acquisition",
      body: "DealFlow captures top-of-funnel traffic through deal pages, collections, comparison pages, and programmatic SEO.",
      icon: SearchCheck,
    },
    {
      title: "Referral Monetization",
      body: "The external app monetizes sign-up bonuses, cashback offers, and affiliate payouts while keeping DealFlow focused on intent-heavy traffic.",
      icon: BadgeDollarSign,
    },
    {
      title: "Content Flywheel",
      body: "Blog posts, email drip flows, and share routes compound traffic and keep new offers circulating through the funnel.",
      icon: Megaphone,
    },
  ] as const;

  const operatingLoop = [
    "Refresh the highest-value live deals and replace placeholder referral URLs in DealFlow.",
    "Publish high-intent bonus content and category pages on 1commerce.world.",
    "Use DealFlow to capture traffic, then route qualified operators toward UnifyOne upsells and revenue operations.",
    "Track performance inside UnifyOne analytics and iterate on the offers that produce the strongest click-to-conversion flow.",
  ] as const;

  const quickRoutes = [
    {
      name: "Best Banking Bonuses",
      href: DEALFLOW_BEST_BANKING_URL,
      description: "High-intent category page for bonus seekers.",
    },
    {
      name: "DealFlow Blog",
      href: DEALFLOW_BLOG_URL,
      description: "Content engine for search traffic and email reuse.",
    },
    {
      name: "Main Site",
      href: DEALFLOW_APP_URL,
      description: "Home page and collections entry point.",
    },
  ] as const;

  const unifyOneHandoffs = [
    {
      name: "Leads",
      href: "/leads",
      description: "Capture and qualify the operators DealFlow sends upstream.",
    },
    {
      name: "Revenue Streams",
      href: "/revenue-streams",
      description: "Track DealFlow as one of the recurring revenue inputs.",
    },
    {
      name: "Affiliate Hub",
      href: "/affiliates",
      description: "Manage partner and payout operations after acquisition.",
    },
    {
      name: "Automations",
      href: "/automations",
      description:
        "Route content, alerts, and follow-up workflows after clicks land.",
    },
  ] as const;

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
            Live at 1commerce.world
          </Badge>
          <Badge variant="secondary">External App</Badge>
          <Badge variant="outline">Revenue Push</Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">DealFlow</h1>
        <p className="text-muted-foreground text-sm mt-1 max-w-3xl">
          DealFlow is now integrated here as an operator launchpad for the live
          referral and affiliate acquisition engine running on 1commerce.world.
          It stays external because the deployed app is a standalone Netlify
          experience with its own auth boundary and no shared backend API.
        </p>
      </div>

      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-amber-400" />
            Integration Boundary
          </CardTitle>
          <CardDescription className="text-amber-100/80">
            {DEALFLOW_EMBED_NOTE}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-amber-50/90 space-y-2">
          <p>
            DealFlow uses its own deployment, routing, and admin auth on
            1commerce.world. This page is the control room that routes you into
            the live app without pretending it shares UnifyOne&apos;s runtime.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {revenueRoles.map(role => {
          const Icon = role.icon;
          return (
            <Card key={role.title}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Icon className="h-4 w-4" /> {role.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">
                  {role.body}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-4 w-4" /> Launch Surfaces
            </CardTitle>
            <CardDescription>
              Open the live DealFlow surfaces that actually drive traffic,
              deals, content, and admin operations.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {launchSurfaces.map(surface => {
              const Icon = surface.icon;
              return (
                <div
                  key={surface.title}
                  className="rounded-xl border border-border bg-background/50 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="h-4 w-4 text-primary" />
                        <p className="font-medium">{surface.title}</p>
                      </div>
                      <p className="text-sm text-muted-foreground leading-6">
                        {surface.description}
                      </p>
                    </div>
                    <Badge variant="outline">{surface.badge}</Badge>
                  </div>
                  <Button asChild className="w-full">
                    <a href={surface.href} target="_blank" rel="noreferrer">
                      {surface.label}
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Revenue Operating Loop
            </CardTitle>
            <CardDescription>
              Treat DealFlow as the acquisition engine and UnifyOne as the
              operating and monetization spine.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm text-muted-foreground">
              {operatingLoop.map((item, index) => (
                <li key={item} className="flex gap-3 leading-6">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recommended Starting Surfaces</CardTitle>
          <CardDescription>
            Open the highest-leverage DealFlow routes first while the revenue
            push is still being tightened.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickRoutes.map(route => (
            <div
              key={route.name}
              className="rounded-xl border border-border bg-background/50 p-4 space-y-3"
            >
              <div>
                <p className="font-medium">{route.name}</p>
                <p className="text-sm text-muted-foreground leading-6 mt-1">
                  {route.description}
                </p>
              </div>
              <Button asChild variant="outline" className="w-full">
                <a href={route.href} target="_blank" rel="noreferrer">
                  Open Route
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Route DealFlow Back Into UnifyOne</CardTitle>
          <CardDescription>
            Use these local modules as the monetization and operations layer
            after DealFlow acquires the click.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {unifyOneHandoffs.map(item => (
            <div
              key={item.name}
              className="rounded-xl border border-border bg-background/50 p-4 space-y-3"
            >
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-muted-foreground leading-6 mt-1">
                  {item.description}
                </p>
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link href={item.href}>Open Module</Link>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integration Snapshot</CardTitle>
          <CardDescription>
            The important details of this DealFlow integration boundary.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <Globe className="h-4 w-4 mt-1 text-primary" />
            <div>
              <p className="font-medium text-foreground">Live deploy</p>
              <p>{DEALFLOW_APP_URL}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Lock className="h-4 w-4 mt-1 text-primary" />
            <div>
              <p className="font-medium text-foreground">Auth boundary</p>
              <p>
                DealFlow uses its own admin and dashboard auth on the external
                deployment.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="h-4 w-4 mt-1 text-primary" />
            <div>
              <p className="font-medium text-foreground">Embedding status</p>
              <p>{DEALFLOW_EMBED_NOTE}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
