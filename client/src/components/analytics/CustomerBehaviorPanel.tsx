import { useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/routers";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Eye,
  ShoppingCart,
  CreditCard,
  CheckCircle2,
  Search,
  Users,
  MousePointerClick,
  TrendingDown,
} from "lucide-react";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type TopViewedProduct = RouterOutputs["analytics"]["topViewedProducts"][number];
type TopSearch = RouterOutputs["analytics"]["topSearches"][number];

const WINDOWS = [7, 30, 90] as const;

function formatNumber(value: number) {
  return Number(value ?? 0).toLocaleString();
}

/** A single funnel stage rendered as a proportional horizontal bar. */
function FunnelStage({
  icon: Icon,
  label,
  value,
  pct,
  conversion,
  color,
}: {
  icon: typeof Eye;
  label: string;
  value: number;
  pct: number;
  conversion?: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <Icon className="h-4 w-4" style={{ color }} />
          {label}
        </div>
        <div className="flex items-center gap-2">
          {conversion !== undefined ? (
            <span className="text-xs text-gray-500">{conversion}% →</span>
          ) : null}
          <span className="font-semibold text-white">
            {formatNumber(value)}
          </span>
        </div>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.04]">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.max(pct, value > 0 ? 4 : 0)}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

/**
 * Customer behavior panel for the Analytics page.
 *
 * Visualizes the first-party behavioral tracking captured in
 * `analytics_events`: the browse → cart → checkout → purchase funnel, the
 * products customers look at most (demand intent), and the searches they run
 * (including unmet demand). Backed by analytics.behaviorSummary /
 * topViewedProducts / topSearches, all tenant-scoped.
 */
export function CustomerBehaviorPanel() {
  const [days, setDays] = useState<(typeof WINDOWS)[number]>(30);

  const summary = trpc.analytics.behaviorSummary.useQuery({ days });
  const topViewed = trpc.analytics.topViewedProducts.useQuery({
    days,
    limit: 8,
  });
  const topSearches = trpc.analytics.topSearches.useQuery({ days, limit: 8 });

  const s = summary.data;
  const maxStage = Math.max(s?.productViews ?? 0, 1);
  const pct = (value: number) => (value / maxStage) * 100;

  const hasFunnelData =
    !!s &&
    s.productViews +
      s.addToCarts +
      s.checkoutStarts +
      s.purchases +
      s.pageViews >
      0;

  const stats = [
    {
      label: "Unique visitors",
      value: s ? formatNumber(s.uniqueVisitors) : "—",
      icon: Users,
      color: "#00D9FF",
    },
    {
      label: "Page views",
      value: s ? formatNumber(s.pageViews) : "—",
      icon: MousePointerClick,
      color: "#0284C7",
    },
    {
      label: "Searches",
      value: s ? formatNumber(s.searches) : "—",
      icon: Search,
      color: "#6A1B9A",
    },
    {
      label: "Cart abandonment",
      value: s ? `${s.cartAbandonment}%` : "—",
      icon: TrendingDown,
      color: "#F43F5E",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Customer behavior
          </h2>
          <p className="text-sm text-gray-400">
            How shoppers browse, search, and convert — from first-party,
            consent-based tracking.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
          {WINDOWS.map(w => (
            <Button
              key={w}
              size="sm"
              variant="ghost"
              onClick={() => setDays(w)}
              className={cn(
                "h-7 px-3 text-xs text-gray-400 hover:text-white",
                days === w && "bg-white/10 text-white"
              )}
            >
              {w}d
            </Button>
          ))}
        </div>
      </div>

      {/* Stat chips */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(stat => (
          <Card key={stat.label} className="border-border bg-card">
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-gray-400">{stat.label}</span>
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${stat.color}20` }}
                >
                  <stat.icon
                    className="h-4 w-4"
                    style={{ color: stat.color }}
                  />
                </div>
              </div>
              {summary.isLoading ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                <div className="text-2xl font-bold text-white">
                  {stat.value}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Conversion funnel */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base text-white">
              Purchase funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary.isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : hasFunnelData && s ? (
              <div className="space-y-4">
                <FunnelStage
                  icon={Eye}
                  label="Product views"
                  value={s.productViews}
                  pct={pct(s.productViews)}
                  color="#00D9FF"
                />
                <FunnelStage
                  icon={ShoppingCart}
                  label="Added to cart"
                  value={s.addToCarts}
                  pct={pct(s.addToCarts)}
                  conversion={s.viewToCartRate}
                  color="#0284C7"
                />
                <FunnelStage
                  icon={CreditCard}
                  label="Checkout started"
                  value={s.checkoutStarts}
                  pct={pct(s.checkoutStarts)}
                  conversion={s.cartToCheckoutRate}
                  color="#8B5CF6"
                />
                <FunnelStage
                  icon={CheckCircle2}
                  label="Purchases"
                  value={s.purchases}
                  pct={pct(s.purchases)}
                  conversion={s.checkoutToPurchaseRate}
                  color="#10B981"
                />
              </div>
            ) : (
              <EmptyState
                title="No behavior data yet"
                body="Once visitors accept analytics cookies and start browsing, their views, cart actions, and purchases will chart here."
              />
            )}
          </CardContent>
        </Card>

        {/* Most-searched queries */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base text-white">Top searches</CardTitle>
          </CardHeader>
          <CardContent>
            {topSearches.isLoading ? (
              <TableSkeleton rows={5} />
            ) : (topSearches.data?.length ?? 0) > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-gray-400">Query</TableHead>
                    <TableHead className="text-right text-gray-400">
                      Searches
                    </TableHead>
                    <TableHead className="text-right text-gray-400">
                      Searchers
                    </TableHead>
                    <TableHead className="text-right text-gray-400">
                      Avg results
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(topSearches.data ?? []).map((row: TopSearch) => {
                    const avg = Number(row.avgResults ?? 0);
                    const noResults = avg === 0;
                    return (
                      <TableRow
                        key={row.query}
                        className="border-white/5 hover:bg-white/5"
                      >
                        <TableCell className="max-w-[180px] truncate font-medium text-white">
                          {row.query}
                        </TableCell>
                        <TableCell className="text-right text-gray-300">
                          {formatNumber(Number(row.searches ?? 0))}
                        </TableCell>
                        <TableCell className="text-right text-gray-400">
                          {formatNumber(Number(row.searchers ?? 0))}
                        </TableCell>
                        <TableCell className="text-right">
                          {noResults ? (
                            <Badge
                              variant="outline"
                              className="border-rose-500/30 bg-rose-500/10 text-rose-300"
                            >
                              no results
                            </Badge>
                          ) : (
                            <span className="text-gray-300">{avg}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                title="No searches yet"
                body="Search terms customers type will appear here. Low-result, high-volume queries reveal demand you don't stock yet."
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Most-viewed products */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base text-white">
            Most-viewed products
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topViewed.isLoading ? (
            <TableSkeleton rows={6} />
          ) : (topViewed.data?.length ?? 0) > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-gray-400">Product</TableHead>
                  <TableHead className="text-right text-gray-400">
                    Views
                  </TableHead>
                  <TableHead className="text-right text-gray-400">
                    Viewers
                  </TableHead>
                  <TableHead className="text-right text-gray-400">
                    Added to cart
                  </TableHead>
                  <TableHead className="text-right text-gray-400">
                    View → cart
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(topViewed.data ?? []).map((row: TopViewedProduct) => (
                  <TableRow
                    key={row.productId ?? row.productName}
                    className="border-white/5 hover:bg-white/5"
                  >
                    <TableCell className="max-w-[260px] truncate font-medium text-white">
                      {row.productName}
                    </TableCell>
                    <TableCell className="text-right text-gray-300">
                      {formatNumber(row.views)}
                    </TableCell>
                    <TableCell className="text-right text-gray-400">
                      {formatNumber(row.viewers)}
                    </TableCell>
                    <TableCell className="text-right text-gray-300">
                      {formatNumber(row.addToCarts)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className={cn(
                          "border-white/10 bg-white/5 text-gray-300",
                          row.viewToCartRate >= 20 &&
                            "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        )}
                      >
                        {row.viewToCartRate}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              title="No product views yet"
              body="When shoppers open product pages, the items drawing the most interest will rank here — independent of what actually sold."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-6 text-center">
      <p className="font-medium text-white">{title}</p>
      <p className="mt-2 max-w-md text-sm text-gray-400">{body}</p>
    </div>
  );
}

function TableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[2fr_1fr_1fr_1fr] items-center gap-3 rounded-lg border border-white/5 p-3"
        >
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="ml-auto h-4 w-12" />
          <Skeleton className="ml-auto h-4 w-12" />
          <Skeleton className="ml-auto h-4 w-12" />
        </div>
      ))}
    </div>
  );
}
