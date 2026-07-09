import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import type { ChartDatum, ChartRange } from "../Dashboard.types";
import { formatCompactCurrency, formatCurrency } from "../Dashboard.utils";

type RevenueTrendCardProps = {
  chartRange: ChartRange;
  setChartRange: (range: ChartRange) => void;
  chartData: ChartDatum[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
};

export function RevenueTrendCard({
  chartRange,
  setChartRange,
  chartData,
  isLoading,
  isError,
  errorMessage,
  onRetry,
}: RevenueTrendCardProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-white">Revenue trend</CardTitle>
          <p className="mt-1 text-sm text-slate-400">
            Paid order revenue over the last{" "}
            {chartRange === "week" ? "7" : "30"} days.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background/60 p-1">
          {(
            [
              ["month", "Monthly"],
              ["week", "Weekly"],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={chartRange === value ? "default" : "ghost"}
              className={cn(
                "h-8 px-3",
                chartRange === value &&
                  "bg-[#D4A843] text-[#020202] hover:bg-[#D4A843]/90"
              )}
              onClick={() => setChartRange(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : isError ? (
          <div className="flex h-[300px] flex-col items-center justify-center gap-3 text-center text-sm text-slate-400">
            <p>
              We could not load revenue history right now.
              {errorMessage ? ` ${errorMessage}` : ""}
            </p>
            <Button variant="outline" onClick={onRetry}>
              Retry
            </Button>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={chartData}
              margin={{ left: 12, right: 12, top: 8, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="dashboardRevenue"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#D4A843" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#D4A843" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="#ffffff10"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: "#94A3B8", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                tick={{ fill: "#94A3B8", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={72}
                tickFormatter={value => formatCompactCurrency(Number(value))}
              />
              <Tooltip
                cursor={{ stroke: "#D4A843", strokeDasharray: "4 4" }}
                contentStyle={{
                  backgroundColor: "#0F172A",
                  border: "1px solid rgba(148, 163, 184, 0.18)",
                  borderRadius: "12px",
                }}
                labelFormatter={(_label, payload) => {
                  const point = payload?.[0]?.payload as ChartDatum | undefined;
                  return point?.fullDate ?? String(_label);
                }}
                formatter={value => [formatCurrency(Number(value)), "Revenue"]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#D4A843"
                strokeWidth={2}
                fill="url(#dashboardRevenue)"
                activeDot={{
                  r: 5,
                  fill: "#D4A843",
                  stroke: "#0F172A",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
