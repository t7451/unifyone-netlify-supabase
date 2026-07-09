import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { STATUS_COLORS } from "../Dashboard.constants";
import type { RecentOrder } from "../Dashboard.types";
import {
  formatCurrency,
  formatCustomerDisplay,
  formatOrderId,
  formatRelative,
} from "../Dashboard.utils";

type RecentOrdersCardProps = {
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
  orders: RecentOrder[];
  navigate: (path: string) => void;
};

export function RecentOrdersCard({
  isLoading,
  isError,
  errorMessage,
  onRetry,
  orders,
  navigate,
}: RecentOrdersCardProps) {
  return (
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
          className="px-0 text-[#D4A843] hover:text-[#D4A843]/80"
          onClick={() => navigate("/orders")}
        >
          View all orders <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
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
        ) : isError ? (
          <div className="space-y-3 text-sm text-slate-400">
            <p>
              We could not load recent orders right now.
              {errorMessage ? ` ${errorMessage}` : ""}
            </p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-slate-400">
            Orders will appear here once customers start checking out.
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order: RecentOrder) => (
              <button
                key={order.id}
                type="button"
                onClick={() => navigate("/orders")}
                className="flex w-full flex-col gap-3 rounded-xl border border-border/60 bg-background/30 p-4 text-left transition-colors hover:border-[#D4A843]/40 hover:bg-[#D4A843]/5 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-medium text-[#D4A843]">
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
  );
}
