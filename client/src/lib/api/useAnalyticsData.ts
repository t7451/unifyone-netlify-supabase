import { trpc } from "@/lib/trpc";

/**
 * Data-access hooks for the Analytics page. Thin, typed wrappers around the
 * exact `trpc.analytics.*` queries the page made inline — same procedures,
 * inputs, and query keys. No behavior change.
 */

export function useAnalyticsSummaryQuery() {
  return trpc.analytics.summary.useQuery();
}

export function useRevenueByDayQuery() {
  return trpc.analytics.revenueByDay.useQuery();
}

export function useTopProductsQuery() {
  return trpc.analytics.topProducts.useQuery({ limit: 5 });
}

export function useWebhookEventsQuery() {
  return trpc.analytics.webhookEvents.useQuery({ limit: 10 });
}
