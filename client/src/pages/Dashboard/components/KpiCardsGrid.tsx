import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { KpiCard } from "../Dashboard.types";
import { getTrendClasses, getTrendIcon } from "../Dashboard.utils";
import { KpiSkeleton } from "./KpiSkeleton";

type KpiCardsGridProps = {
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
  kpiCards: KpiCard[];
};

export function KpiCardsGrid({
  isLoading,
  isError,
  errorMessage,
  onRetry,
  kpiCards,
}: KpiCardsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {isLoading ? (
        Array.from({ length: 4 }, (_, index) => <KpiSkeleton key={index} />)
      ) : isError ? (
        <Card className="border-border bg-card xl:col-span-4">
          <CardContent className="flex flex-col gap-3 p-6 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
            <p>
              We could not load dashboard KPIs right now.
              {errorMessage ? ` ${errorMessage}` : ""}
            </p>
            <Button variant="outline" onClick={onRetry}>
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
  );
}
