import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

import type { ChartRange, OnboardingStatus } from "./Dashboard.types";
import {
  buildChartData,
  buildKpiCards,
  getOnboardingStorageKey,
  readOnboardingStatus,
  writeOnboardingStatus,
} from "./Dashboard.utils";

export function useDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const provisionDefault = trpc.tenant.provisionDefault.useMutation();
  const provisioningRef = useRef(false);
  const [chartRange, setChartRange] = useState<ChartRange>("month");
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingInitialCategoryId, setOnboardingInitialCategoryId] =
    useState<string>();
  const [onboardingStatus, setOnboardingStatus] =
    useState<OnboardingStatus>("dismissed");

  const onboardingStorageKey = getOnboardingStorageKey(user?.openId);

  const dashboardOverview = trpc.analytics.dashboardOverview.useQuery();
  const revenueByDay = trpc.analytics.revenueByDay.useQuery({
    days: chartRange === "week" ? 7 : 30,
  });
  const topProductsSummary = trpc.analytics.topProductsSummary.useQuery({
    limit: 5,
  });
  const recentOrders = trpc.orders.recentOrders.useQuery();

  useEffect(() => {
    // A signed-in user with no tenant gets a default workspace auto-provisioned
    // so they land directly in the product — no mandatory /setup gate. If
    // provisioning fails, fall back to the manual setup flow. Naming/renaming
    // and demo-data seeding remain available at /setup.
    if (!user || user.tenantId) return;
    if (provisioningRef.current) return;
    provisioningRef.current = true;

    provisionDefault.mutate(undefined, {
      onSuccess: () => {
        // Reload the session so user.tenantId is populated; stay on /dashboard.
        void utils.auth.me.invalidate();
      },
      onError: () => {
        provisioningRef.current = false;
        navigate("/setup");
      },
    });
    // `navigate`/`utils`/mutation are stable; omitted to avoid re-runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const status = readOnboardingStatus(onboardingStorageKey);
    setOnboardingStatus(status);
    setOnboardingOpen(status === "new");
  }, [onboardingStorageKey, user]);

  const persistOnboardingStatus = (
    status: Exclude<OnboardingStatus, "new">
  ) => {
    writeOnboardingStatus(onboardingStorageKey, status);
    setOnboardingStatus(status);
  };

  const openOnboarding = (categoryId?: string) => {
    setOnboardingInitialCategoryId(categoryId);
    setOnboardingOpen(true);
  };

  const handleOnboardingOpenChange = (open: boolean) => {
    setOnboardingOpen(open);

    if (!open && onboardingStatus === "new") {
      persistOnboardingStatus("dismissed");
    }
  };

  const handleOnboardingComplete = () => {
    persistOnboardingStatus("completed");
    setOnboardingOpen(false);
  };

  const handleOnboardingNavigate = (path: string) => {
    if (onboardingStatus === "new") {
      persistOnboardingStatus("dismissed");
    }
    setOnboardingOpen(false);
    navigate(path);
  };

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
  const overview = dashboardOverview.data;
  const operationsHealthy =
    !dashboardOverview.isError &&
    !revenueByDay.isError &&
    !topProductsSummary.isError &&
    !recentOrders.isError;
  const latestOrder = visibleRecentOrders[0];

  return {
    user,
    navigate,
    chartRange,
    setChartRange,
    onboardingOpen,
    onboardingInitialCategoryId,
    onboardingStatus,
    dashboardOverview,
    revenueByDay,
    topProductsSummary,
    recentOrders,
    openOnboarding,
    handleOnboardingOpenChange,
    handleOnboardingComplete,
    handleOnboardingNavigate,
    kpiCards,
    chartData,
    hasNoOrders,
    visibleRecentOrders,
    visibleTopProducts,
    overview,
    operationsHealthy,
    latestOrder,
  };
}
