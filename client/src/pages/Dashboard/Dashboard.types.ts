import type { inferRouterOutputs } from "@trpc/server";
import type { PackagePlus, TrendingUp } from "lucide-react";

import type { AppRouter } from "../../../../server/routers";

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type DashboardOverview = RouterOutputs["analytics"]["dashboardOverview"];
export type RevenuePoint = RouterOutputs["analytics"]["revenueByDay"][number];
export type TopProductSummary =
  RouterOutputs["analytics"]["topProductsSummary"][number];
export type RecentOrder = RouterOutputs["orders"]["recentOrders"][number];

export type TrendTone = "positive" | "negative" | "neutral";
export type ChartRange = "month" | "week";

export type KpiCard = {
  label: string;
  value: string;
  helper: string;
  footer: string;
  icon: typeof TrendingUp;
  iconClassName: string;
  helperTone: TrendTone;
};

export type ChartDatum = {
  label: string;
  fullDate: string;
  revenue: number;
};

export type StarterAction = {
  title: string;
  description: string;
  href: string;
  icon: typeof PackagePlus;
};

export type OnboardingStatus = "new" | "dismissed" | "completed";
