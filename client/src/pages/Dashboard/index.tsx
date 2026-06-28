import {
  Activity,
  ArrowRight,
  Clock,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardPageShell } from "@/components/DashboardPageShell";
import { FeatureOnboardingWizard } from "@/components/FeatureOnboardingWizard";
import { cn } from "@/lib/utils";

import { FeatureCatalogCard } from "./components/FeatureCatalogCard";
import { GettingStartedCard } from "./components/GettingStartedCard";
import { KpiCardsGrid } from "./components/KpiCardsGrid";
import { RecentOrdersCard } from "./components/RecentOrdersCard";
import { RevenueTrendCard } from "./components/RevenueTrendCard";
import { TopProductsCard } from "./components/TopProductsCard";
import {
  formatChange,
  formatCompactCurrency,
  formatRelative,
} from "./Dashboard.utils";
import { useDashboard } from "./useDashboard";

export default function Dashboard() {
  const {
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
  } = useDashboard();

  return (
    <DashboardPageShell
      eyebrow="Commerce command center"
      title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, ${user?.name ?? "operator"}`}
      description="Monitor revenue, fulfillment, customer growth, and product momentum from a single operating view built for daily action."
      actions={
        <>
          <Button
            variant="outline"
            onClick={() => openOnboarding()}
            className="border-white/10 bg-white/5 text-white hover:bg-white/10"
          >
            Open feature guide
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              void dashboardOverview.refetch();
              void revenueByDay.refetch();
              void topProductsSummary.refetch();
              void recentOrders.refetch();
            }}
            className="border-white/10 bg-white/5 text-white hover:bg-white/10"
          >
            Refresh command data
          </Button>
          <Button
            onClick={() => navigate("/orders")}
            className="bg-[#00D9FF] font-semibold text-[#0A1128] hover:bg-[#00D9FF]/90"
          >
            Work order queue <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </>
      }
      meta={
        <>
          <Badge
            variant="outline"
            className={cn(
              "border-white/10 bg-white/5",
              operationsHealthy ? "text-emerald-300" : "text-amber-300"
            )}
          >
            <Activity className="mr-1.5 h-3.5 w-3.5" />
            {operationsHealthy ? "All modules responsive" : "Needs attention"}
          </Badge>
          <Badge variant="outline" className="border-white/10 bg-white/5">
            <Clock className="mr-1.5 h-3.5 w-3.5" />
            Latest order{" "}
            {latestOrder ? formatRelative(latestOrder.createdAt) : "pending"}
          </Badge>
        </>
      }
      stats={[
        {
          label: "MTD revenue",
          value: overview
            ? formatCompactCurrency(overview.revenueThisMonth)
            : "Loading",
          helper: overview
            ? formatChange(overview.revenueChangePct)
            : "Syncing analytics",
          icon: TrendingUp,
          tone: "emerald",
        },
        {
          label: "Order flow",
          value: overview
            ? overview.ordersThisMonth.toLocaleString()
            : "Loading",
          helper: overview
            ? `${overview.paidOrdersThisMonth.toLocaleString()} paid this month`
            : "Loading order pipeline",
          icon: ShoppingCart,
          tone: "cyan",
        },
        {
          label: "Customer base",
          value: overview
            ? overview.customersTotal.toLocaleString()
            : "Loading",
          helper: overview
            ? `${overview.customersNewThisMonth.toLocaleString()} new this month`
            : "Loading customer graph",
          icon: Users,
          tone: "violet",
        },
        {
          label: "Ops posture",
          value: operationsHealthy ? "Stable" : "Review",
          helper: operationsHealthy
            ? "KPIs, charts, products, and orders are online"
            : "One or more dashboard queries need retry",
          icon: ShieldCheck,
          tone: operationsHealthy ? "emerald" : "amber",
        },
      ]}
    >
      <FeatureOnboardingWizard
        open={onboardingOpen}
        initialCategoryId={onboardingInitialCategoryId}
        onOpenChange={handleOnboardingOpenChange}
        onComplete={handleOnboardingComplete}
        onNavigate={handleOnboardingNavigate}
      />

      <FeatureCatalogCard
        onboardingStatus={onboardingStatus}
        openOnboarding={openOnboarding}
      />

      <KpiCardsGrid
        isLoading={dashboardOverview.isLoading}
        isError={dashboardOverview.isError}
        errorMessage={dashboardOverview.error?.message}
        onRetry={() => void dashboardOverview.refetch()}
        kpiCards={kpiCards}
      />

      {hasNoOrders &&
      !dashboardOverview.isLoading &&
      !dashboardOverview.isError ? (
        <GettingStartedCard navigate={navigate} />
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <RevenueTrendCard
          chartRange={chartRange}
          setChartRange={setChartRange}
          chartData={chartData}
          isLoading={revenueByDay.isLoading}
          isError={revenueByDay.isError}
          errorMessage={revenueByDay.error?.message}
          onRetry={() => void revenueByDay.refetch()}
        />

        <TopProductsCard
          isLoading={topProductsSummary.isLoading}
          isError={topProductsSummary.isError}
          errorMessage={topProductsSummary.error?.message}
          onRetry={() => void topProductsSummary.refetch()}
          products={visibleTopProducts}
        />
      </div>

      <RecentOrdersCard
        isLoading={recentOrders.isLoading}
        isError={recentOrders.isError}
        errorMessage={recentOrders.error?.message}
        onRetry={() => void recentOrders.refetch()}
        orders={visibleRecentOrders}
        navigate={navigate}
      />
    </DashboardPageShell>
  );
}
