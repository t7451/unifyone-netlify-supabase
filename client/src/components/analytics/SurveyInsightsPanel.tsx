import { useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/routers";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquareQuote, Quote } from "lucide-react";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type Results = RouterOutputs["surveys"]["results"];
type TopAnswer = Results["topAnswers"][number];
type RecentResponse = Results["recent"][number];

const WINDOWS = [7, 30, 90] as const;

function surveyLabel(type: string): string {
  if (type === "exit_intent") return "Exit intent";
  if (type === "post_purchase") return "Post-purchase";
  return "Survey";
}

function formatWhen(value: Date | string) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Voice-of-customer panel: the qualitative "WHY" from exit-intent and
 * post-purchase microsurveys — most common answers and recent verbatims.
 * Backed by surveys.results, tenant-scoped.
 */
export function SurveyInsightsPanel() {
  const [days, setDays] = useState<(typeof WINDOWS)[number]>(30);
  const results = trpc.surveys.results.useQuery({ days });
  const data = results.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Voice of customer
          </h2>
          <p className="text-sm text-gray-400">
            Why shoppers buy — or don&apos;t — in their own words, from
            exit-intent and post-purchase microsurveys.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
          {WINDOWS.map(w => (
            <Button
              key={w}
              size="sm"
              variant="ghost"
              onClick={() => setDays(w)}
              className={cn(
                "h-7 px-3 text-xs text-gray-400 hover:text-white",
                days === w && "bg-white/10 text-white"
              )}
            >
              {w}d
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top answers */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <MessageSquareQuote className="h-4 w-4 text-amber-300" />
              Most common answers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {results.isLoading ? (
              <ListSkeleton />
            ) : (data?.topAnswers.length ?? 0) > 0 ? (
              <div className="space-y-2">
                {(data?.topAnswers ?? []).map((row: TopAnswer, i: number) => (
                  <div
                    key={`${row.surveyType}-${row.answer}-${i}`}
                    className="flex items-start justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-white">
                        {row.answer}
                      </p>
                      <Badge
                        variant="outline"
                        className="mt-1 border-white/10 bg-white/5 text-[10px] text-gray-400"
                      >
                        {surveyLabel(row.surveyType)}
                      </Badge>
                    </div>
                    <span className="shrink-0 font-semibold text-white">
                      {row.count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState body="Answers from your exit-intent and post-purchase surveys will appear here, ranked by how often shoppers give them." />
            )}
          </CardContent>
        </Card>

        {/* Recent verbatims */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <Quote className="h-4 w-4 text-[#00D9FF]" />
              Recent responses
              {data && data.total > 0 ? (
                <Badge
                  variant="outline"
                  className="ml-1 border-white/10 bg-white/5 text-[10px] text-gray-400"
                >
                  {data.total} total
                </Badge>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {results.isLoading ? (
              <ListSkeleton />
            ) : (data?.recent.length ?? 0) > 0 ? (
              <div className="space-y-2">
                {(data?.recent ?? []).map((row: RecentResponse) => (
                  <div
                    key={row.id}
                    className="rounded-lg border border-white/5 bg-white/[0.02] p-3"
                  >
                    <p className="text-sm text-gray-200">
                      &ldquo;{row.answer || "—"}&rdquo;
                    </p>
                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-gray-500">
                      <span>{surveyLabel(row.surveyType)}</span>
                      <span>·</span>
                      <span>{formatWhen(row.createdAt)}</span>
                      {row.rating != null ? (
                        <>
                          <span>·</span>
                          <span>{row.rating}/5</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState body="Individual survey responses show here as they come in — the raw 'why' straight from shoppers." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptyState({ body }: { body: string }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-6 text-center">
      <p className="max-w-md text-sm text-gray-400">{body}</p>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-white/5 p-3">
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}
