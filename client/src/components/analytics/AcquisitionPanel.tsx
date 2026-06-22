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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Compass, LogOut, Globe } from "lucide-react";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type Source = RouterOutputs["analytics"]["acquisitionSources"][number];
type Destination = RouterOutputs["analytics"]["outboundDestinations"][number];
type GeoRow = RouterOutputs["analytics"]["geoBreakdown"][number];

const WINDOWS = [7, 30, 90] as const;

function formatNumber(value: number) {
  return Number(value ?? 0).toLocaleString();
}

/** Turn raw source keys (ai:chatgpt, utm:newsletter, referral:google.com). */
function formatSource(source: string): string {
  if (source === "direct") return "Direct";
  if (source === "organic-search") return "Organic search";
  const [prefix, ...rest] = source.split(":");
  const value = rest.join(":");
  if (prefix === "ai") return `AI · ${value}`;
  if (prefix === "utm") return `Campaign · ${value}`;
  if (prefix === "referral") return value;
  return source;
}

const COUNTRY_NAMES = new Intl.DisplayNames(["en"], { type: "region" });
function formatCountry(code: string): string {
  try {
    return COUNTRY_NAMES.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/**
 * "Where" panel for the Analytics page: where visitors come from (acquisition
 * source), where they go when they leave (outbound destinations), and where
 * they are (coarse country geo). All first-party / edge-derived — no off-site
 * tracking. Backed by analytics.acquisitionSources / outboundDestinations /
 * geoBreakdown, tenant-scoped.
 */
export function AcquisitionPanel() {
  const [days, setDays] = useState<(typeof WINDOWS)[number]>(30);

  const sources = trpc.analytics.acquisitionSources.useQuery({ days });
  const exits = trpc.analytics.outboundDestinations.useQuery({ days });
  const geo = trpc.analytics.geoBreakdown.useQuery({ days });

  const maxVisitors = Math.max(
    1,
    ...(geo.data ?? []).map(g => Number(g.visitors ?? 0))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Where visitors come from &amp; go
          </h2>
          <p className="text-sm text-gray-400">
            Acquisition source, exit destinations, and location — first-party
            signals, no cross-site tracking.
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Acquisition sources */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <Compass className="h-4 w-4 text-[#00D9FF]" />
              Traffic sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sources.isLoading ? (
              <ListSkeleton />
            ) : (sources.data?.length ?? 0) > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-gray-400">Source</TableHead>
                    <TableHead className="text-right text-gray-400">
                      Visits
                    </TableHead>
                    <TableHead className="text-right text-gray-400">
                      Visitors
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(sources.data ?? []).map((row: Source) => (
                    <TableRow
                      key={row.source}
                      className="border-white/5 hover:bg-white/5"
                    >
                      <TableCell className="max-w-[160px] truncate font-medium text-white">
                        {formatSource(row.source)}
                      </TableCell>
                      <TableCell className="text-right text-gray-300">
                        {formatNumber(Number(row.visits ?? 0))}
                      </TableCell>
                      <TableCell className="text-right text-gray-400">
                        {formatNumber(Number(row.visitors ?? 0))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState body="Where visitors arrive from (search, AI, campaigns, referrals, direct) will appear here." />
            )}
          </CardContent>
        </Card>

        {/* Outbound destinations */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <LogOut className="h-4 w-4 text-amber-300" />
              Exit destinations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {exits.isLoading ? (
              <ListSkeleton />
            ) : (exits.data?.length ?? 0) > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-gray-400">Goes to</TableHead>
                    <TableHead className="text-right text-gray-400">
                      Clicks
                    </TableHead>
                    <TableHead className="text-right text-gray-400">
                      Visitors
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(exits.data ?? []).map((row: Destination) => (
                    <TableRow
                      key={row.destination}
                      className="border-white/5 hover:bg-white/5"
                    >
                      <TableCell className="max-w-[160px] truncate font-medium text-white">
                        {row.destination}
                      </TableCell>
                      <TableCell className="text-right text-gray-300">
                        {formatNumber(Number(row.clicks ?? 0))}
                      </TableCell>
                      <TableCell className="text-right text-gray-400">
                        {formatNumber(Number(row.visitors ?? 0))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState body="When visitors click a link off your site, the domains they head to will rank here." />
            )}
          </CardContent>
        </Card>

        {/* Geo breakdown */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <Globe className="h-4 w-4 text-violet-300" />
              Top countries
            </CardTitle>
          </CardHeader>
          <CardContent>
            {geo.isLoading ? (
              <ListSkeleton />
            ) : (geo.data?.length ?? 0) > 0 ? (
              <div className="space-y-3">
                {(geo.data ?? []).map((row: GeoRow) => {
                  const visitors = Number(row.visitors ?? 0);
                  return (
                    <div key={row.country}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="truncate font-medium text-white">
                          {formatCountry(row.country)}
                        </span>
                        <span className="text-gray-400">
                          {formatNumber(visitors)}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.04]">
                        <div
                          className="h-full rounded-full bg-violet-400/70"
                          style={{
                            width: `${Math.max((visitors / maxVisitors) * 100, 4)}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState body="Visitor locations (country level, from the CDN edge) will appear here once traffic with consent comes in." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptyState({ body }: { body: string }) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-4 text-center">
      <p className="max-w-xs text-sm text-gray-400">{body}</p>
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
