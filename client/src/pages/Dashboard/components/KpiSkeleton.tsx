import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function KpiSkeleton() {
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
