import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import type { inferRouterOutputs } from "@trpc/server";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CreditCard,
  PackagePlus,
  Percent,
  ShoppingCart,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";

import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import type { AppRouter } from "../../../server/routers";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type DashboardOverview = RouterOutputs["analytics"]["dashboardOverview"];
type RevenuePoint = RouterOutputs["analytics"]["revenueByDay"][number];
type TopProductSummary =
  RouterOutputs["analytics"]["topProductsSummary"][number];
type RecentOrder = RouterOutputs["orders"]["recentOrders"][number];
type TrendTone = "positive" | "negative" | "neutral";
type ChartRange = "month" | "week";

type KpiCard = {
  label: string;
  value: string;
  helper: string;
  footer: string;
  icon: typeof TrendingUp;
  iconClassName: string;
  helperTone: TrendTone;
};

type ChartDatum = {
  label: string;
  fullDate: string;
  revenue: number;
};

type StarterAction = {
  title: string;
  description: string;
  href: string;
  icon: typeof PackagePlus;
};

const STATUS_COLORS: Record<string, string> = {
  delivered: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  shipped: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  confirmed: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  processing: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  cancelled: "border-red-500/30 bg-red-500/10 text-red-300",
  refunded: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-300",
};

const STARTER_ACTIONS: StarterAction[] = [
  {
    title: "Add your first product",
    description:
      "Create a sellable product so orders and revenue can start flowing.",
    href: "/products",
    icon: PackagePlus,
  },
  {
    title: "Connect Stripe",
    description: "Link your payment rails to start collecting paid orders.",
    href: "/integrations",
    icon: CreditCard,
  },
  {
    title: "Invite a teammate",
    description: "Bring in your ops or fulfillment team to help run the store.",
    href: "/team",
    icon: UserPlus,
  },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCompactCurrency(value: number) {
  if (value >= 1000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }

  return formatCurrency(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatChange(value: number) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}% vs last month`;
}

function formatRelative(value: Date | string | null | undefined) {
  if (!value) return "Unknown";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function parseDateValue(value: string | Date) {
  if (typeof value !== "string") {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const normalized = value.length <= 10 ? `${value}T00:00:00` : value;
  const parsed = new Date(normalized);
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function toDayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function buildChartData(points: RevenuePoint[], days: number): ChartDatum[] {
  const revenueByDay = new Map<string, number>();

  for (const point of points) {
    const date = parseDateValue(point.date);
    revenueByDay.set(toDayKey(date), Number(point.revenue ?? 0));
  }

  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(end);
    date.setDate(end.getDate() - (days - index - 1));

    return {
      label: date.toLocaleDateString(
        "en-US",
        days <= 7 ? { weekday: "short" } : { month: "short", day: "numeric" }
      ),
      fullDate: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      revenue: revenueByDay.get(toDayKey(date)) ?? 0,
    };
  });
}

function getTrendTone(value: number): TrendTone {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}

function getTrendIcon(tone: TrendTone) {
  if (tone === "positive") return ArrowUpRight;
  if (tone === "negative") return ArrowDownRight;
  return ArrowRight;
}

function getTrendClasses(tone: TrendTone) {
  if (tone === "positive") return "text-emerald-300";
  if (tone === "negative") return "text-red-300";
  return "text-slate-300";
}

function formatCustomerDisplay(order: RecentOrder) {
  if (order.customerName && order.customerEmail) {
    return `${order.customerName} · ${order.customerEmail}`;
  }

  return order.customerName ?? order.customerEmail ?? "Guest checkout";
}

function formatOrderId(order: RecentOrder) {
  const value = String(order.orderNumber ?? order.id).toUpperCase();
  return `#${value.slice(-8)}`;
}

function buildKpiCards(overview: DashboardOverview): KpiCard[] {
  const conversionDelta =
    overview.conversionRateThisMonth - overview.conversionRateLastMonth;

  return [
    {
      label: "Total Revenue",
      value: formatCurrency(overview.revenueThisMonth),
      helper: formatChange(overview.revenueChangePct),
      footer: "Paid orders this month",
      icon: TrendingUp,
      iconClassName: "bg-emerald-500/15 text-emerald-300",
      helperTone: getTrendTone(overview.revenueChangePct),
    },
    {
      label: "Orders",
      value: overview.ordersThisMonth.toLocaleString(),
      helper: formatChange(overview.ordersChangePct),
      footer: "Orders created this month",
      icon: ShoppingCart,
      iconClassName: "bg-sky-500/15 text-sky-300",
      helperTone: getTrendTone(overview.ordersChangePct),
    },
    {
      label: "Customers",
      value: overview.customersTotal.toLocaleString(),
      helper: `${overview.customersNewThisMonth.toLocaleString()} new this month`,
      footer: "Total customer profiles",
      icon: Users,
      iconClassName: "bg-violet-500/15 text-violet-300",
      helperTone: overview.customersNewThisMonth > 0 ? "positive" : "neutral",
    },
    {
      label: "Conversion Rate",
      value: formatPercent(overview.conversionRateThisMonth),
      helper: `${conversionDelta >= 0 ? "+" : ""}${conversionDelta.toFixed(1)} pts vs last month`,
      footer: `${overview.paidOrdersThisMonth.toLocaleString()} paid / ${overview.totalOrdersThisMonth.toLocaleString()} total`,
      icon: Percent,
      iconClassName: "bg-amber-500/15 text-amber-300",
      helperTone: getTrendTone(conversionDelta),
    },
  ];
}

function KpiSkeleton() {
  return (
    <Card className="border-border bg-card">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [chartRange, setChartRange] = useState<ChartRange>("month");

  const dashboardOverview = trpc.analytics.dashboardOverview.useQuery();
  const revenueByDay = trpc.analytics.revenueByDay.useQuery({
    days: chartRange === "week" ? 7 : 30,
  });
  const topProductsSummary = trpc.analytics.topProductsSummary.useQuery({
    limit: 5,
  });
  const recentOrders = trpc.orders.recentOrders.useQuery();

  useEffect(() => {
    if (user && !user.tenantId) {
      navigate("/setup");
    }
    // `navigate` from wouter is stable; omitted to avoid unnecessary re-runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const kpiCards = useMemo(
    () => (dashboardOverview.data ? buildKpiCards(dashboardOverview.data) : []),
    [dashboardOverview.data]
  );

  const chartData = useMemo(
    () =>
      buildChartData(revenueByDay.data ?? [], chartRange === "week" ? 7 : 30),
    [chartRange, revenueByDay.data]
  );

  const hasNoOrders = (dashboardOverview.data?.totalOrdersAllTime ?? 0) === 0;
  const visibleRecentOrders = (recentOrders.data ?? []).slice(0, 5);
  const visibleTopProducts = topProductsSummary.data ?? [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-400">
            Live performance for {user?.name ?? "your workspace"}
          </p>
        </div>
        <Button
          onClick={() => navigate("/orders")}
          className="bg-[#00D9FF] font-semibold text-[#0A1128] hover:bg-[#00D9FF]/90"
        >
          View all orders <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboardOverview.isLoading ? (
          Array.from({ length: 4 }, (_, index) => <KpiSkeleton key={index} />)
        ) : dashboardOverview.isError ? (
          <Card className="border-border bg-card xl:col-span-4">
            <CardContent className="flex flex-col gap-3 p-6 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
              <p>
                We could not load dashboard KPIs right now.
                {dashboardOverview.error.message
                  ? ` ${dashboardOverview.error.message}`
                  : ""}
              </p>
              <Button
                variant="outline"
                onClick={() => void dashboardOverview.refetch()}
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : (
          kpiCards.map(card => {
            const TrendIcon = getTrendIcon(card.helperTone);

            return (
              <Card key={card.label} className="border-border bg-card">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">{card.label}</p>
                      <p className="mt-2 text-3xl font-semibold text-white">
                        {card.value}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-xl",
                        card.iconClassName
                      )}
                    >
                      <card.icon className="h-5 w-5" />
                    </div>
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-1 text-sm",
                      getTrendClasses(card.helperTone)
                    )}
                  >
                    <TrendIcon className="h-4 w-4" />
                    <span>{card.helper}</span>
                  </div>
                  <p className="text-xs text-slate-500">{card.footer}</p>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {hasNoOrders &&
      !dashboardOverview.isLoading &&
      !dashboardOverview.isError ? (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-white">Getting started</CardTitle>
            <p className="text-sm text-slate-400">
              Your dashboard is ready. Complete these next steps to unlock live
              commerce metrics.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {STARTER_ACTIONS.map(action => (
                <button
                  key={action.title}
                  type="button"
                  onClick={() => navigate(action.href)}
                  className="rounded-xl border border-border bg-background/40 p-4 text-left transition-colors hover:border-[#00D9FF]/40 hover:bg-[#00D9FF]/5"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#00D9FF]/10 text-[#00D9FF]">
                    <action.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-medium text-white">{action.title}</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    {action.description}
                  </p>
                  <div className="mt-4 flex items-center text-sm font-medium text-[#00D9FF]">
                    Open <ArrowRight className="ml-1 h-4 w-4" />
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
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
                      "bg-[#00D9FF] text-[#0A1128] hover:bg-[#00D9FF]/90"
                  )}
                  onClick={() => setChartRange(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {revenueByDay.isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : revenueByDay.isError ? (
              <div className="flex h-[300px] flex-col items-center justify-center gap-3 text-center text-sm text-slate-400">
                <p>
                  We could not load revenue history right now.
                  {revenueByDay.error.message
                    ? ` ${revenueByDay.error.message}`
                    : ""}
                </p>
                <Button
                  variant="outline"
                  onClick={() => void revenueByDay.refetch()}
                >
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
                      <stop
                        offset="5%"
                        stopColor="#00D9FF"
                        stopOpacity={0.35}
                      />
                      <stop offset="95%" stopColor="#00D9FF" stopOpacity={0} />
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
                    tickFormatter={value =>
                      formatCompactCurrency(Number(value))
                    }
                  />
                  <Tooltip
                    cursor={{ stroke: "#00D9FF", strokeDasharray: "4 4" }}
                    contentStyle={{
                      backgroundColor: "#0F172A",
                      border: "1px solid rgba(148, 163, 184, 0.18)",
                      borderRadius: "12px",
                    }}
                    labelFormatter={(_label, payload) => {
                      const point = payload?.[0]?.payload as
                        | ChartDatum
                        | undefined;
                      return point?.fullDate ?? String(_label);
                    }}
                    formatter={value => [
                      formatCurrency(Number(value)),
                      "Revenue",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#00D9FF"
                    strokeWidth={2}
                    fill="url(#dashboardRevenue)"
                    activeDot={{
                      r: 5,
                      fill: "#00D9FF",
                      stroke: "#0F172A",
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-white">Top Products</CardTitle>
            <p className="mt-1 text-sm text-slate-400">
              Top 5 products by paid revenue this month.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {topProductsSummary.isLoading ? (
              Array.from({ length: 5 }, (_, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))
            ) : topProductsSummary.isError ? (
              <div className="space-y-3 text-sm text-slate-400">
                <p>
                  We could not load top products right now.
                  {topProductsSummary.error.message
                    ? ` ${topProductsSummary.error.message}`
                    : ""}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void topProductsSummary.refetch()}
                >
                  Retry
                </Button>
              </div>
            ) : visibleTopProducts.length === 0 ? (
              <p className="text-sm text-slate-400">
                No paid product sales yet this month.
              </p>
            ) : (
              visibleTopProducts.map(
                (product: TopProductSummary, index: number) => (
                  <div
                    key={`${product.productId ?? product.productName}-${index}`}
                    className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/30 p-3"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#00D9FF]/10 text-sm font-semibold text-[#00D9FF]">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {product.productName}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span>
                          {formatCurrency(Number(product.totalRevenue ?? 0))}
                        </span>
                        <Badge variant="secondary">
                          {Number(product.orderCount ?? 0)} orders
                        </Badge>
                      </div>
                    </div>
                  </div>
                )
              )
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-white">Recent Orders</CardTitle>
            <p className="mt-1 text-sm text-slate-400">
              Your latest 5 orders with status, buyer info, and timing.
            </p>
          </div>
          <Button
            variant="ghost"
            className="px-0 text-[#00D9FF] hover:text-[#00D9FF]/80"
            onClick={() => navigate("/orders")}
          >
            View all orders <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {recentOrders.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }, (_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 rounded-xl border border-border/60 p-4"
                >
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          ) : recentOrders.isError ? (
            <div className="space-y-3 text-sm text-slate-400">
              <p>
                We could not load recent orders right now.
                {recentOrders.error.message
                  ? ` ${recentOrders.error.message}`
                  : ""}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void recentOrders.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : visibleRecentOrders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-slate-400">
              Orders will appear here once customers start checking out.
            </div>
          ) : (
            <div className="space-y-3">
              {visibleRecentOrders.map((order: RecentOrder) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => navigate("/orders")}
                  className="flex w-full flex-col gap-3 rounded-xl border border-border/60 bg-background/30 p-4 text-left transition-colors hover:border-[#00D9FF]/40 hover:bg-[#00D9FF]/5 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-medium text-[#00D9FF]">
                        {formatOrderId(order)}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "capitalize",
                          STATUS_COLORS[order.status] ??
                            "border-slate-500/30 bg-slate-500/10 text-slate-300"
                        )}
                      >
                        {order.status}
                      </Badge>
                    </div>
                    <p className="mt-2 truncate text-sm text-slate-300">
                      {formatCustomerDisplay(order)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-sm font-semibold text-white">
                      {formatCurrency(Number(order.total ?? 0))}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatRelative(order.createdAt)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
