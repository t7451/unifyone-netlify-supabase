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
import { TrendingUp, Search, Telescope } from "lucide-react";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type UnmetRow = RouterOutputs["analytics"]["unmetDemand"][number];
type RankedQuery = { query: string; value: number };

const WINDOWS = [7, 30, 90] as const;

function formatNumber(value: number) {
  return Number(value ?? 0).toLocaleString();
}

/**
 * Market intelligence panel: unmet demand (high-volume, zero-result searches on
 * your own site) plus an on-demand Google Trends explorer for any seed term.
 * Backed by analytics.unmetDemand / trendingQueries.
 */
export function MarketDemandPanel() {
  const [days, setDays] = useState<(typeof WINDOWS)[number]>(30);
  const unmet = trpc.analytics.unmetDemand.useQuery({ days });

  const trends = trpc.analytics.trendingQueries.useMutation();
  const [term, setTerm] = useState("");

  const explore = () => {
    const t = term.trim();
    if (!t || trends.isPending) return;
    trends.mutate({ term: t });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Market &amp; unmet demand
          </h2>
          <p className="text-sm text-gray-400">
            Demand you&apos;re missing on-site, plus what the broader market is
            searching for.
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
        {/* Unmet demand */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <Search className="h-4 w-4 text-rose-300" />
              Demand you&apos;re not meeting
            </CardTitle>
          </CardHeader>
          <CardContent>
            {unmet.isLoading ? (
              <ListSkeleton />
            ) : (unmet.data?.length ?? 0) > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-gray-400">
                      Searched for
                    </TableHead>
                    <TableHead className="text-right text-gray-400">
                      Searches
                    </TableHead>
                    <TableHead className="text-right text-gray-400">
                      Avg results
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(unmet.data ?? []).map((row: UnmetRow) => (
                    <TableRow
                      key={row.query}
                      className="border-white/5 hover:bg-white/5"
                    >
                      <TableCell className="max-w-[200px] truncate font-medium text-white">
                        {row.query}
                      </TableCell>
                      <TableCell className="text-right text-gray-300">
                        {formatNumber(Number(row.searches ?? 0))}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={cn(
                            "border-white/10 bg-white/5 text-gray-300",
                            Number(row.avgResults ?? 0) === 0 &&
                              "border-rose-500/30 bg-rose-500/10 text-rose-300"
                          )}
                        >
                          {Number(row.avgResults ?? 0) === 0
                            ? "no results"
                            : Number(row.avgResults)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState body="Searches that return little or nothing on your site show here — each one is a product or detail shoppers want that you don't surface yet." />
            )}
          </CardContent>
        </Card>

        {/* Google Trends explorer */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <Telescope className="h-4 w-4 text-[#00D9FF]" />
              Explore market trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex gap-2">
              <input
                value={term}
                onChange={e => setTerm(e.target.value.slice(0, 100))}
                onKeyDown={e => {
                  if (e.key === "Enter") explore();
                }}
                placeholder="e.g. a product or category"
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-[#00D9FF]/50 focus:outline-none"
              />
              <Button
                size="sm"
                onClick={explore}
                disabled={trends.isPending || !term.trim()}
                className="bg-[#00D9FF] font-semibold text-black hover:bg-[#00B8D9]"
              >
                {trends.isPending ? "…" : "Explore"}
              </Button>
            </div>

            {trends.isPending ? (
              <ListSkeleton />
            ) : trends.isError ? (
              <EmptyState body="Couldn't reach Google Trends just now. Try again in a moment." />
            ) : trends.data ? (
              trends.data.available ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TrendColumn
                    title="Rising"
                    icon
                    rows={trends.data.rising}
                    emptyLabel="No rising queries"
                  />
                  <TrendColumn
                    title="Top related"
                    rows={trends.data.top}
                    emptyLabel="No related queries"
                  />
                </div>
              ) : (
                <EmptyState
                  body={`Google Trends is rate-limited or unavailable for "${trends.data.term}" right now (it has no official API). Try again shortly — results cache for 6 hours when they do come through.`}
                />
              )
            ) : (
              <EmptyState body="Type a product or category and hit Explore to see what the broader market is searching for (rising + top related queries from Google Trends)." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TrendColumn({
  title,
  rows,
  emptyLabel,
  icon,
}: {
  title: string;
  rows: RankedQuery[];
  emptyLabel: string;
  icon?: boolean;
}) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wide text-gray-400">
        {icon ? <TrendingUp className="h-3.5 w-3.5 text-emerald-300" /> : null}
        {title}
      </p>
      {rows.length > 0 ? (
        <ul className="space-y-1.5">
          {rows.map(r => (
            <li
              key={r.query}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="truncate text-gray-200">{r.query}</span>
              <span className="shrink-0 text-xs text-gray-500">{r.value}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-gray-500">{emptyLabel}</p>
      )}
    </div>
  );
}

function EmptyState({ body }: { body: string }) {
  return (
    <div className="flex min-h-[160px] flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-4 text-center">
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
          <Skeleton className="h-4 w-10" />
        </div>
      ))}
    </div>
  );
}
