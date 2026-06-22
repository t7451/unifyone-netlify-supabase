import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, RefreshCw } from "lucide-react";

/**
 * On-demand AI "why" summary. Reads the tenant's behavior + search + survey
 * signals (server-side) and renders a plain-English explanation of why
 * customers are or aren't buying. The LLM call is rate-limited and only fires
 * when the owner clicks Generate.
 */
export function WhySummaryCard() {
  const why = trpc.analytics.whySummary.useMutation();
  const data = why.data;

  const generate = () => {
    if (why.isPending) return;
    why.mutate({ days: 30 });
  };

  return (
    <Card className="border-border bg-gradient-to-b from-amber-500/[0.06] to-card">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base text-white">
          <Sparkles className="h-4 w-4 text-amber-300" />
          Why customers buy — AI summary
        </CardTitle>
        <Button
          size="sm"
          onClick={generate}
          disabled={why.isPending}
          className="bg-amber-400 text-neutral-950 hover:bg-amber-300"
        >
          {why.isPending ? (
            <>
              <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
              Analyzing…
            </>
          ) : data ? (
            "Regenerate"
          ) : (
            "Generate"
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {why.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        ) : why.isError ? (
          <p className="text-sm text-rose-300">
            Couldn&apos;t generate a summary right now. Please try again in a
            moment.
          </p>
        ) : data ? (
          <div className="space-y-3">
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-200">
              {data.summary}
            </div>
            <p className="text-[11px] text-gray-500">
              Based on the last {data.days} days
              {data.model ? ` · ${data.model}` : ""} ·{" "}
              {new Date(data.generatedAt).toLocaleString()}
            </p>
          </div>
        ) : (
          <div className="flex min-h-[140px] flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-6 text-center">
            <p className="max-w-md text-sm text-gray-400">
              Generate a plain-English read on why shoppers are converting (or
              not) — synthesized from your funnel, searches, product engagement,
              and survey answers.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
