import { useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/routers";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import {
  BADGE_NEUTRAL,
  BADGE_EMERALD,
  BADGE_ROSE,
} from "@/lib/constants/badges";
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
import { Clock, Filter } from "lucide-react";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type EngagementRow = RouterOutputs["analytics"]["productEngagement"][number];
type Funnel = RouterOutputs["analytics"]["funnelDropoff"];

const WINDOWS = [7, 30, 90] as const;

function formatDwell(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

const FUNNEL_STAGES: Array<{
  key: keyof Pick<Funnel, "viewed" | "carted" | "checkedOut" | "purchased">;
  label: string;
  dropKey?: keyof Pick<
    Funnel,
    "viewToCart" | "cartToCheckout" | "checkoutToPurchase"
  >;
  color: string;
}> = [
  { key: "viewed", label: "Viewed a product", color: "#D4A843" },
  {
    key: "carted",
    label: "Added to cart",
    dropKey: "viewToCart",
    color: "#0284C7",
  },
  {
    key: "checkedOut",
    label: "Started checkout",
    dropKey: "cartToCheckout",
    color: "#8B5CF6",
  },
  {
    key: "purchased",
    label: "Purchased",
    dropKey: "checkoutToPurchase",
    color: "#10B981",
  },
];

/**
 * Engagement + funnel-dropoff panel: how intensely shoppers engage with each
 * product (dwell time, scroll depth) and where in the journey distinct
 * visitors fall out. Backed by analytics.productEngagement / funnelDropoff.
 */
export function EngagementPanel() {
  const [days, setDays] = useState<(typeof WINDOWS)[number]>(30);

  const funnel = trpc.analytics.funnelDropoff.useQuery({ days });
  const engagement = trpc.analytics.productEngagement.useQuery({ days });

  const f = funnel.data;
  const maxStage = Math.max(1, f?.viewed ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Engagement &amp; drop-off
          </h2>
          <p className="text-sm text-gray-400">
            How deeply shoppers engage with products, and where they leave the
            journey.
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Funnel drop-off */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <Filter className="h-4 w-4 text-[#D4A843]" />
              Where visitors drop off
            </CardTitle>
          </CardHeader>
          <CardContent>
            {funnel.isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : f && f.viewed > 0 ? (
              <div className="space-y-4">
                {FUNNEL_STAGES.map(stage => {
                  const value = f[stage.key];
                  const drop = stage.dropKey ? f[stage.dropKey] : undefined;
                  return (
                    <div key={stage.key}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                        <span className="text-gray-300">{stage.label}</span>
                        <div className="flex items-center gap-2">
                          {drop !== undefined ? (
                            <Badge
                              variant="outline"
                              className={cn(
                                "border-white/10 bg-white/5 text-gray-400",
                                drop >= 50 && BADGE_ROSE
                              )}
                            >
                              −{drop}%
                            </Badge>
                          ) : null}
                          <span className="font-semibold text-white">
                            {formatNumber(value)}
                          </span>
                        </div>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.04]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max((value / maxStage) * 100, value > 0 ? 4 : 0)}%`,
                            backgroundColor: stage.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
                <p className="pt-1 text-xs text-gray-500">
                  Distinct visitors reaching each stage; −% is the share lost at
                  that step.
                </p>
              </div>
            ) : (
              <EmptyState body="Once visitors browse and check out, the stage-by-stage drop-off will show here — so you can see exactly where they bail." />
            )}
          </CardContent>
        </Card>

        {/* Product engagement depth */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <Clock className="h-4 w-4 text-amber-300" />
              Product engagement depth
            </CardTitle>
          </CardHeader>
          <CardContent>
            {engagement.isLoading ? (
              <ListSkeleton />
            ) : (engagement.data?.length ?? 0) > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-gray-400">Product</TableHead>
                    <TableHead className="text-right text-gray-400">
                      Avg dwell
                    </TableHead>
                    <TableHead className="text-right text-gray-400">
                      Avg scroll
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(engagement.data ?? []).map((row: EngagementRow) => (
                    <TableRow
                      key={row.productId ?? row.productName}
                      className="border-white/5 hover:bg-white/5"
                    >
                      <TableCell className="max-w-[200px] truncate font-medium text-white">
                        {row.productName}
                      </TableCell>
                      <TableCell className="text-right text-gray-300">
                        {formatDwell(row.avgDwellSec)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={cn(
                            BADGE_NEUTRAL,
                            row.avgScrollPct >= 60 && BADGE_EMERALD
                          )}
                        >
                          {row.avgScrollPct}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState body="Dwell time and scroll depth per product appear once shoppers spend time on product pages — high dwell + low cart-rate flags a pricing or detail problem." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptyState({ body }: { body: string }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-6 text-center">
      <p className="max-w-md text-sm text-gray-400">{body}</p>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-3 rounded-lg border border-white/5 p-3"
        >
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  );
}
