import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Percent,
  ShoppingCart,
  TrendingUp,
  Users,
} from "lucide-react";

import { ONBOARDING_STORAGE_PREFIX } from "./Dashboard.constants";
import type {
  ChartDatum,
  DashboardOverview,
  KpiCard,
  OnboardingStatus,
  RecentOrder,
  RevenuePoint,
  TrendTone,
} from "./Dashboard.types";

export function getOnboardingStorageKey(openId: string | null | undefined) {
  return `${ONBOARDING_STORAGE_PREFIX}:${openId ?? "anonymous"}`;
}

export function readOnboardingStatus(storageKey: string): OnboardingStatus {
  if (typeof window === "undefined") return "dismissed";

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return "new";

    const parsed = JSON.parse(raw) as { status?: OnboardingStatus };
    if (parsed.status === "completed" || parsed.status === "dismissed") {
      return parsed.status;
    }
  } catch {
    return "new";
  }

  return "new";
}

export function writeOnboardingStatus(
  storageKey: string,
  status: Exclude<OnboardingStatus, "new">
) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    storageKey,
    JSON.stringify({ status, updatedAt: new Date().toISOString() })
  );
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCompactCurrency(value: number) {
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

export function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function formatChange(value: number) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}% vs last month`;
}

export function formatRelative(value: Date | string | null | undefined) {
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

export function parseDateValue(value: string | Date) {
  if (typeof value !== "string") {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const normalized = value.length <= 10 ? `${value}T00:00:00` : value;
  const parsed = new Date(normalized);
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

export function toDayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function buildChartData(
  points: RevenuePoint[],
  days: number
): ChartDatum[] {
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

export function getTrendTone(value: number): TrendTone {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}

export function getTrendIcon(tone: TrendTone) {
  if (tone === "positive") return ArrowUpRight;
  if (tone === "negative") return ArrowDownRight;
  return ArrowRight;
}

export function getTrendClasses(tone: TrendTone) {
  if (tone === "positive") return "text-emerald-300";
  if (tone === "negative") return "text-red-300";
  return "text-slate-300";
}

export function formatCustomerDisplay(order: RecentOrder) {
  if (order.customerName && order.customerEmail) {
    return `${order.customerName} · ${order.customerEmail}`;
  }

  return order.customerName ?? order.customerEmail ?? "Guest checkout";
}

export function formatOrderId(order: RecentOrder) {
  const value = String(order.orderNumber ?? order.id).toUpperCase();
  return `#${value.slice(-8)}`;
}

export function buildKpiCards(overview: DashboardOverview): KpiCard[] {
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
