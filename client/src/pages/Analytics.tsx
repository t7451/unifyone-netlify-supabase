import { trpc } from "@/lib/trpc";
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
import { DashboardPageShell } from "@/components/DashboardPageShell";
import { CustomerBehaviorPanel } from "@/components/analytics/CustomerBehaviorPanel";
import { AcquisitionPanel } from "@/components/analytics/AcquisitionPanel";
import { EngagementPanel } from "@/components/analytics/EngagementPanel";
import { SurveyInsightsPanel } from "@/components/analytics/SurveyInsightsPanel";
import { WhySummaryCard } from "@/components/analytics/WhySummaryCard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Line,
  ComposedChart,
  Legend,
} from "recharts";
import {
  Activity,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  RefreshCw,
} from "lucide-react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import { cn } from "@/lib/utils";

function statusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "processed") return "default";
  if (status === "failed") return "destructive";
  return "secondary";
}

type RouterOutputs = inferRouterOutputs<AppRouter>;
type RevenuePoint = RouterOutputs["analytics"]["revenueByDay"][number];
type TopProduct = RouterOutputs["analytics"]["topProducts"][number];
type WebhookEvent = RouterOutputs["analytics"]["webhookEvents"][number];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTimestamp(value: Date | string | null | undefined) {
  if (!value) return "Unknown";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
}

export default function Analytics() {
  const summary = trpc.analytics.summary.useQuery();
  const revenueByDay = trpc.analytics.revenueByDay.useQuery();
  const topProducts = trpc.analytics.topProducts.useQuery({ limit: 5 });
  const webhookLog = trpc.analytics.webhookEvents.useQuery({ limit: 10 });

  const chartData = (revenueByDay.data ?? []).map((point: RevenuePoint) => ({
    date: new Date(point.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    revenue: Number(point.revenue ?? 0),
    orders: Number(point.count ?? 0),
  }));

  const topProductData = (topProducts.data ?? []).map(
    (product: TopProduct, index: number) => ({
      rank: index + 1,
      fullName: product.productName,
      revenue: Number(product.totalRevenue ?? 0),
      orderCount: Number(product.orderCount ?? 0),
      totalQuantity: Number(product.totalQuantity ?? 0),
    })
  );

  const recentWebhooks = webhookLog.data ?? [];

  const metrics = [
    {
      label: "Total Revenue",
      value: formatCurrency(Number(summary.data?.totalRevenue ?? 0)),
      icon: DollarSign,
      color: "#00D9FF",
    },
    {
      label: "Total Orders",
      value: summary.data?.orderCount ?? 0,
      icon: ShoppingCart,
      color: "#0284C7",
    },
    {
      label: "Customers",
      value: summary.data?.customerCount ?? 0,
      icon: Users,
      color: "#6A1B9A",
    },
    {
      label: "Avg Order Value",
      value: formatCurrency(
        summary.data?.orderCount
          ? Number(summary.data.totalRevenue ?? 0) / summary.data.orderCount
          : 0
      ),
      icon: TrendingUp,
      color: "#10B981",
    },
    {
      label: "Total Products",
      value: summary.data?.productCount ?? 0,
      icon: Package,
      color: "#F59E0B",
    },
  ];
  const operationalStatus =
    !summary.isError &&
    !revenueByDay.isError &&
    !topProducts.isError &&
    !webhookLog.isError;

  return (
    <DashboardPageShell
      eyebrow="Intelligence center"
      title="Analytics"
      description="Track revenue quality, product winners, customer growth, and webhook reliability from one decision dashboard."
      actions={
        <Button
          variant="outline"
          onClick={() => {
            void summary.refetch();
            void revenueByDay.refetch();
            void topProducts.refetch();
            void webhookLog.refetch();
          }}
          className="border-white/10 bg-white/5 text-white hover:bg-white/10"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh analytics
        </Button>
      }
      meta={
        <Badge
          variant="outline"
          className={cn(
            "border-white/10 bg-white/5",
            operationalStatus ? "text-emerald-300" : "text-amber-300"
          )}
        >
          <Activity className="mr-1.5 h-3.5 w-3.5" />
          {operationalStatus ? "Analytics online" : "Analytics degraded"}
        </Badge>
      }
      stats={metrics.slice(0, 4).map(metric => ({
        label: metric.label,
        value: metric.value,
        helper: "Current tenant scope",
        icon: metric.icon,
        tone:
          metric.label === "Total Revenue"
            ? "emerald"
            : metric.label === "Total Orders"
              ? "cyan"
              : metric.label === "Customers"
                ? "violet"
                : "amber",
      }))}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {metrics.map(metric => (
          <Card key={metric.label} className="border-border bg-card">
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-gray-400">{metric.label}</span>
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${metric.color}20` }}
                >
                  <metric.icon
                    className="h-4 w-4"
                    style={{ color: metric.color }}
                  />
                </div>
              </div>
              <div className="text-2xl font-bold text-white">
                {metric.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="border-border bg-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base text-white">
              Revenue &amp; Orders (30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {revenueByDay.isLoading ? (
              <Skeleton className="h-[240px] w-full" />
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={chartData}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00D9FF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00D9FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#9CA3AF", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="revenue"
                    tick={{ fill: "#9CA3AF", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="orders"
                    orientation="right"
                    tick={{ fill: "#9CA3AF", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0F172A",
                      border: "1px solid #1e3a5f",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === "Revenue ($)") {
                        return [formatCurrency(Number(value ?? 0)), name];
                      }
                      return [Number(value ?? 0).toLocaleString(), name];
                    }}
                  />
                  <Legend wrapperStyle={{ color: "#9CA3AF", fontSize: 12 }} />
                  <Area
                    yAxisId="revenue"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#00D9FF"
                    strokeWidth={2}
                    fill="url(#revGrad)"
                    name="Revenue ($)"
                  />
                  <Line
                    yAxisId="orders"
                    type="monotone"
                    dataKey="orders"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    dot={false}
                    name="Orders"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[240px] items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-6 text-center text-sm text-gray-400">
                No revenue data yet. Orders and revenue trends will appear here
                once transactions start flowing in.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base text-white">Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-lg border border-white/5 p-3"
                  >
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <div className="flex gap-2">
                        <Skeleton className="h-5 w-20 rounded-full" />
                        <Skeleton className="h-5 w-24 rounded-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : topProductData.length > 0 ? (
              <div className="space-y-3">
                {topProductData.map(product => (
                  <div
                    key={product.fullName}
                    className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3"
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        product.rank === 1 &&
                          "bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/20",
                        product.rank === 2 &&
                          "bg-slate-400/20 text-slate-200 ring-1 ring-slate-400/20",
                        product.rank === 3 &&
                          "bg-orange-500/20 text-orange-300 ring-1 ring-orange-500/20",
                        product.rank > 3 && "bg-white/5 text-gray-400"
                      )}
                    >
                      {product.rank}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="truncate font-medium text-white">
                        {product.fullName}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant="outline"
                          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        >
                          {formatCurrency(product.revenue)} revenue
                        </Badge>
                        <Badge
                          variant="outline"
                          className="border-sky-500/30 bg-sky-500/10 text-sky-300"
                        >
                          {product.orderCount.toLocaleString()} orders
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {product.totalQuantity.toLocaleString()} units sold
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[240px] flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-6 text-center">
                <p className="font-medium text-white">
                  No product performance yet
                </p>
                <p className="mt-2 text-sm text-gray-400">
                  Top-selling products will show up here after your first orders
                  are placed.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CustomerBehaviorPanel />

      <AcquisitionPanel />

      <EngagementPanel />

      <SurveyInsightsPanel />

      <WhySummaryCard />

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base text-white">
            Recent Webhook Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          {webhookLog.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[1fr_2fr_auto_1.4fr] items-center gap-3 rounded-lg border border-white/5 p-3"
                >
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="ml-auto h-4 w-28" />
                </div>
              ))}
            </div>
          ) : recentWebhooks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-gray-400">Source</TableHead>
                  <TableHead className="text-gray-400">Event Type</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-right text-gray-400">
                    Timestamp
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentWebhooks.map((event: WebhookEvent) => (
                  <TableRow
                    key={event.id}
                    className="border-white/5 hover:bg-white/5"
                  >
                    <TableCell className="font-medium capitalize text-white">
                      {event.source}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-gray-400">
                      {event.eventType}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={statusVariant(event.status)}
                        className={cn(
                          event.status === "processed" &&
                            "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
                          event.status === "failed" &&
                            "border-red-500/30 bg-red-500/15 text-red-400",
                          event.status === "skipped" &&
                            "border-amber-500/30 bg-amber-500/15 text-amber-400",
                          event.status !== "processed" &&
                            event.status !== "failed" &&
                            event.status !== "skipped" &&
                            "border-slate-500/30 bg-slate-500/15 text-slate-300"
                        )}
                      >
                        {event.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-gray-500">
                      {formatTimestamp(event.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-6 text-center">
              <p className="font-medium text-white">No webhook activity yet</p>
              <p className="mt-2 text-sm text-gray-400">
                Incoming Stripe, Shopify, and internal webhook events will
                appear here once integrations start sending traffic.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardPageShell>
  );
}
