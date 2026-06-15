import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Loader2,
  Lock,
  Megaphone,
  MousePointerClick,
  Rocket,
  Search,
  SearchCheck,
  Shield,
  Sparkles,
  Workflow,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
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

      <DealflowLiveDeals />

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

/**
 * Coerce the `dealflowRouter` MCP result into a flat list of deal records.
 * The MCP worker may return an array, an object with `deals`/`results`, or a
 * `{ content: [{ type: "text", text }] }` envelope whose text is JSON.
 */
function asDeals(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.deals)) return obj.deals as Record<string, unknown>[];
    if (Array.isArray(obj.results))
      return obj.results as Record<string, unknown>[];
    if (Array.isArray(obj.content)) {
      const text = obj.content
        .map(part =>
          part && typeof part === "object" && "text" in part
            ? String((part as Record<string, unknown>).text ?? "")
            : ""
        )
        .join("");
      try {
        const parsed = JSON.parse(text);
        return asDeals(parsed);
      } catch {
        return [];
      }
    }
  }
  return [];
}

function dealString(
  deal: Record<string, unknown>,
  keys: string[],
  fallback = ""
) {
  for (const key of keys) {
    const value = deal[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number" && Number.isFinite(value))
      return String(value);
  }
  return fallback;
}

/**
 * Live DealFlow data, served by the `dealflow` tRPC router (MCP-backed). This
 * is the in-app surface that actually reads tenant-scoped deals, so DealFlow is
 * no longer only a launchpad of external links.
 */
function DealflowLiveDeals() {
  const [search, setSearch] = useState("");
  const [submitted, setSubmitted] = useState("");

  const dealsQuery = trpc.dealflow.listDeals.useQuery(
    { limit: 12, ...(submitted ? { search: submitted } : {}) },
    { retry: false }
  );

  const trackConversion = trpc.dealflow.trackConversion.useMutation({
    onSuccess: () => toast.success("Click tracked"),
    onError: e => toast.error(e.message),
  });

  const deals = asDeals(dealsQuery.data);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BadgeDollarSign className="h-4 w-4" /> Live Deals
            </CardTitle>
            <CardDescription>
              Tenant-scoped deals pulled directly from the DealFlow service.
            </CardDescription>
          </div>
          <form
            className="flex gap-2"
            onSubmit={event => {
              event.preventDefault();
              setSubmitted(search.trim());
            }}
          >
            <Input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search deals..."
              className="sm:w-64"
            />
            <Button type="submit" variant="outline">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardHeader>
      <CardContent>
        {dealsQuery.isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : dealsQuery.isError ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            DealFlow service is unavailable right now (
            {dealsQuery.error.message}
            ). The external launch surfaces below still work.
          </div>
        ) : deals.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No deals found{submitted ? ` for “${submitted}”` : ""}.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {deals.map((deal, index) => {
              const id = dealString(
                deal,
                ["id", "deal_id", "slug"],
                String(index)
              );
              const title = dealString(
                deal,
                ["title", "name", "headline"],
                "Untitled deal"
              );
              const category = dealString(deal, ["category", "type"]);
              const reward = dealString(deal, [
                "reward",
                "bonus",
                "payout",
                "value",
              ]);
              return (
                <div
                  key={id}
                  className="rounded-xl border border-border bg-background/50 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium leading-5">{title}</p>
                    {category && <Badge variant="outline">{category}</Badge>}
                  </div>
                  {reward && (
                    <p className="text-sm text-emerald-400 font-medium">
                      {reward}
                    </p>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    disabled={trackConversion.isPending}
                    onClick={() =>
                      trackConversion.mutate({ dealId: id, eventType: "click" })
                    }
                  >
                    <MousePointerClick className="h-3.5 w-3.5" /> Track Click
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
