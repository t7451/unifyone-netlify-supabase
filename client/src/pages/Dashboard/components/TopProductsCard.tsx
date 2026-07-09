import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import type { TopProductSummary } from "../Dashboard.types";
import { formatCurrency } from "../Dashboard.utils";

type TopProductsCardProps = {
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
  products: TopProductSummary[];
};

export function TopProductsCard({
  isLoading,
  isError,
  errorMessage,
  onRetry,
  products,
}: TopProductsCardProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-white">Top Products</CardTitle>
        <p className="mt-1 text-sm text-slate-400">
          Top 5 products by paid revenue this month.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
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
        ) : isError ? (
          <div className="space-y-3 text-sm text-slate-400">
            <p>
              We could not load top products right now.
              {errorMessage ? ` ${errorMessage}` : ""}
            </p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          </div>
        ) : products.length === 0 ? (
          <p className="text-sm text-slate-400">
            No paid product sales yet this month.
          </p>
        ) : (
          products.map((product: TopProductSummary, index: number) => (
            <div
              key={`${product.productId ?? product.productName}-${index}`}
              className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/30 p-3"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#D4A843]/10 text-sm font-semibold text-[#D4A843]">
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
          ))
        )}
      </CardContent>
    </Card>
  );
}
