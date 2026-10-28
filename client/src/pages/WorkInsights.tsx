import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  Calculator,
  CircleHelp,
  Clock3,
  FileUp,
  Layers3,
  Play,
  RefreshCw,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  calculateWorkProfit,
  DEFAULT_PROFIT_SETTINGS,
} from "@shared/workProfit";
import { DashboardPageShell } from "@/components/DashboardPageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

const usd = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value
  );
const decimal = (value: number) =>
  value.toLocaleString("en-US", { maximumFractionDigits: 1 });
const validNumber = (value: string) =>
  value.trim() !== "" && Number.isFinite(Number(value)) && Number(value) >= 0;
const PERIODS = [
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
  { value: "all", label: "All recorded work" },
] as const;
type Period = (typeof PERIODS)[number]["value"];
const FIELD_DETAILS = [
  {
    key: "costPerMile",
    label: "Vehicle cost per mile ($)",
    hint: "Include fuel, upkeep, insurance and depreciation. The starting value is an example assumption; replace it with your own estimate.",
  },
  {
    key: "otherCosts",
    label: "Extra unlogged costs this period ($)",
    hint: "Only costs you have not saved in Expenses or already deducted from earnings. In mileage mode, also leave out vehicle costs covered by your per-mile estimate.",
  },
  {
    key: "taxReservePercent",
    label: "Planning tax reserve (%)",
    hint: "The share of positive operating profit you want to reserve. This is a planning choice, not a calculated tax bill or an actual transfer.",
  },
  {
    key: "targetHourly",
    label: "Hourly goal after reserve ($)",
    hint: "The amount you want to keep for each recorded work hour after estimated costs and your chosen reserve.",
  },
] as const;
type Assumptions = Record<(typeof FIELD_DETAILS)[number]["key"], string>;

function localToday() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export default function WorkInsights() {
  const [costMode, setCostMode] = useState<"mileage" | "recorded">("mileage");
  const [asOfDate, setAsOfDate] = useState(localToday);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const updateDate = () => {
      clearTimeout(timer);
      setAsOfDate(localToday());
      const nextDay = new Date();
      nextDay.setHours(24, 0, 0, 0);
      timer = setTimeout(
        updateDate,
        Math.max(1, nextDay.getTime() - Date.now())
      );
    };
    const onVisible = () => {
      if (!document.hidden) updateDate();
    };
    updateDate();
    window.addEventListener("focus", updateDate);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", updateDate);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  const [period, setPeriod] = useState<Period>("month");
  const [assumptions, setAssumptions] = useState<Assumptions>({
    costPerMile: String(DEFAULT_PROFIT_SETTINGS.costPerMile),
    otherCosts: "0",
    taxReservePercent: String(DEFAULT_PROFIT_SETTINGS.taxReservePercent),
    targetHourly: String(DEFAULT_PROFIT_SETTINGS.targetHourly),
  });
  const summary = trpc.workInsights.summary.useQuery(
    { period, asOfDate },
    { retry: false }
  );
  const data = summary.data;
  const valid =
    Object.entries(assumptions).every(
      ([key, value]) =>
        (key === "costPerMile" && costMode === "recorded") || validNumber(value)
    ) && Number(assumptions.taxReservePercent) < 100;
  const settings = {
    costPerMile: costMode === "recorded" ? 0 : Number(assumptions.costPerMile),
    taxReservePercent: Number(assumptions.taxReservePercent),
    targetHourly: Number(assumptions.targetHourly),
  };
  const includedCount =
    data?.bySource.reduce((count, source) => count + source.records, 0) ?? 0;
  const hasTimedWork = !!data && data.tracked.hours > 0 && includedCount > 0;
  const savedCosts = data
    ? (costMode === "mileage"
        ? data.expenses.otherCents
        : data.expenses.totalCents) / 100
    : 0;
  const calculation = (() => {
    if (!data || !hasTimedWork || !valid)
      return { result: null, sources: [], overflow: false };
    try {
      const result = calculateWorkProfit(
        {
          ...data.tracked,
          otherCosts:
            data.tracked.otherCosts +
            savedCosts +
            Number(assumptions.otherCosts),
        },
        settings
      );
      const sources = data.bySource
        .map(source => ({
          ...source,
          profit: calculateWorkProfit(
            {
              earnings: source.earnings,
              hours: source.hours,
              miles: source.miles,
              otherCosts: source.otherCosts,
            },
            settings
          ),
        }))
        .sort(
          (a, b) =>
            b.profit.operatingProfit / b.hours -
            a.profit.operatingProfit / a.hours
        );
      return { result, sources, overflow: false };
    } catch {
      return { result: null, sources: [], overflow: true };
    }
  })();
  const { result, sources } = calculation;
  const selectedPeriod = PERIODS.find(option => option.value === period)!.label;
  const partialCoverage =
    (data?.excluded.count ?? 0) > 0 || (data?.imported.count ?? 0) > 0;

  return (
    <DashboardPageShell
      eyebrow="The return on your time"
      title="What your work pays"
      description="See what stays yours after estimated work costs and a tax reserve you choose. Use your recorded delivery, rideshare and freelance work to decide what is worth your time."
      meta={
        <>
          <Badge
            variant="outline"
            className="border-border text-muted-foreground"
          >
            Recorded work only · USD
          </Badge>
          <Badge
            variant="outline"
            className="border-border text-muted-foreground"
          >
            {selectedPeriod}
          </Badge>
        </>
      }
      actions={
        <Link
          href="/gig-command"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Play className="h-4 w-4" />
          Track work
        </Link>
      }
    >
      <section
        className="flex flex-wrap items-center justify-between gap-3"
        aria-label="Choose a reporting period"
      >
        <div className="flex flex-wrap gap-2">
          {PERIODS.map(option => (
            <Button
              key={option.value}
              variant={period === option.value ? "default" : "outline"}
              className="min-h-11"
              aria-pressed={period === option.value}
              onClick={() => setPeriod(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
        <Button
          variant="ghost"
          className="min-h-11"
          disabled={summary.isFetching}
          onClick={() => void summary.refetch()}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${summary.isFetching ? "animate-spin" : ""}`}
          />
          {summary.isFetching ? "Refreshing…" : "Refresh records"}
        </Button>
      </section>

      <p className="text-xs text-muted-foreground">
        Work uses a rolling 7-day timestamp window or UTC month/year. Expenses
        use your local calendar: the last 7 dates, month or year through{" "}
        {asOfDate}. Date-only expenses cannot match a partial-day work cutoff.
        Update extra unlogged costs when changing periods.
      </p>

      {summary.isLoading ? (
        <section
          role="status"
          aria-label="Loading work insights"
          className="space-y-4"
        >
          <p className="text-sm text-muted-foreground">
            Loading your recorded work…
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map(item => (
              <Skeleton key={item} className="h-36 w-full rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </section>
      ) : summary.isError ? (
        <Card className="border-destructive/30">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold">
              Your work insights could not load
            </h2>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground">
              We could not retrieve your records. Your saved work has not been
              changed. Try again to calculate your results.
            </p>
            <Button
              variant="outline"
              className="mt-4 min-h-11"
              onClick={() => void summary.refetch()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : data ? (
        <>
          {partialCoverage && (
            <section
              className="rounded-2xl border border-amber-400/25 bg-amber-400/5 p-4 sm:p-5"
              aria-labelledby="coverage-heading"
            >
              <h2
                id="coverage-heading"
                className="flex items-center gap-2 text-sm font-semibold text-amber-200"
              >
                <CircleHelp className="h-4 w-4" />
                Some earnings need more context
              </h2>
              <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">
                {data.excluded.count > 0 && (
                  <p>
                    {data.excluded.count} completed record
                    {data.excluded.count === 1 ? " is" : "s are"} excluded from
                    hourly calculations because working time or financial
                    details are missing or unusable. Known earnings on those
                    records: <strong>{usd(data.excluded.earnings)}</strong>.
                  </p>
                )}
                {data.imported.count > 0 && (
                  <p>
                    <strong>{usd(data.imported.earnings)}</strong> across{" "}
                    {data.imported.count} imported record
                    {data.imported.count === 1 ? "" : "s"} remain separate
                    because imports do not provide reliable work hours. They are
                    not added to the profit figures below.
                  </p>
                )}
                <p>
                  Linked bank and provider activity also stays in{" "}
                  <Link
                    href="/connected-money"
                    className="font-medium text-primary underline underline-offset-4"
                  >
                    Connected accounts
                  </Link>
                  . Keeping these sources separate avoids counting the same
                  earnings twice.
                </p>
              </div>
            </section>
          )}

          {!hasTimedWork ? (
            <Card>
              <CardContent className="p-6 sm:p-8">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Clock3 className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-semibold">
                  Your earnings need working time
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  There are no usable completed work sessions for this period
                  yet. Record your working time—including waiting, travel
                  between jobs and client admin—to see a meaningful hourly
                  result.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href="/gig-command"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <Play className="h-4 w-4" />
                    Track a work session
                  </Link>
                  <Link
                    href="/money-manager"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium"
                  >
                    <FileUp className="h-4 w-4" />
                    View earnings and imports
                  </Link>
                </div>
                <p className="mt-5 text-sm text-muted-foreground">
                  Have earnings and hours handy?{" "}
                  <Link
                    href="/tools/gig-hourly-rate"
                    className="font-medium text-primary underline underline-offset-4"
                  >
                    Try the hourly calculator
                  </Link>
                  .
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <section
                className="grid gap-4 sm:grid-cols-3"
                aria-label="Recorded work included in this view"
              >
                {[
                  {
                    label: "Included earnings",
                    value: usd(data.tracked.earnings),
                    helper: "Recorded pay, tips and bonuses",
                    icon: Wallet,
                  },
                  {
                    label: "Recorded working time",
                    value: `${decimal(data.tracked.hours)} hours`,
                    helper: `${includedCount} completed session${includedCount === 1 ? "" : "s"} included`,
                    icon: Clock3,
                  },
                  {
                    label: "Recorded business miles",
                    value: `${decimal(data.tracked.miles)} mi`,
                    helper:
                      costMode === "mileage"
                        ? "Used with your cost-per-mile estimate"
                        : "No mileage cost is subtracted in recorded mode",
                    icon: TrendingUp,
                  },
                ].map(item => (
                  <Card key={item.label}>
                    <CardContent className="p-5">
                      <p className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                        {item.label}
                        <item.icon className="h-4 w-4 text-primary" />
                      </p>
                      <p className="mt-3 text-2xl font-semibold tabular-nums">
                        {item.value}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {item.helper}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </section>
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Calculator className="h-5 w-5 text-primary" />
                      Make the estimate yours
                    </CardTitle>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      Adjust these assumptions for this period. Nothing here is
                      saved to your account, and no money is transferred.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <fieldset className="space-y-3">
                      <legend className="text-sm font-semibold">
                        How should costs be counted?
                      </legend>
                      {(
                        [
                          [
                            "mileage",
                            "Mileage cost estimate",
                            "Use a per-mile vehicle estimate plus saved nonvehicle expenses. Saved fuel, maintenance and insurance are excluded.",
                          ],
                          [
                            "recorded",
                            "Recorded expenses",
                            "Use all saved expenses with no per-mile vehicle estimate.",
                          ],
                        ] as const
                      ).map(([value, label, hint]) => (
                        <label
                          key={value}
                          className="flex cursor-pointer items-start gap-3 rounded-xl border p-3"
                        >
                          <input
                            type="radio"
                            name="cost-mode"
                            value={value}
                            checked={costMode === value}
                            onChange={() => setCostMode(value)}
                            className="mt-1 h-4 w-4 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                          <span>
                            <span className="block text-sm font-medium">
                              {label}
                            </span>
                            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                              {hint}
                            </span>
                          </span>
                        </label>
                      ))}
                    </fieldset>
                    <div className="rounded-xl border p-4 text-sm">
                      <p>
                        {data.expenses.count} saved expense
                        {data.expenses.count === 1 ? "" : "s"} ·{" "}
                        {usd(data.expenses.totalCents / 100)} total
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {usd(savedCosts)} applied in this mode. Expenses are
                        self-reported and may not include every actual cost.
                        Period expenses can also cover work missing from this
                        view.
                      </p>
                      <Link
                        href="/work-expenses"
                        className="mt-3 inline-block font-medium text-primary underline underline-offset-4"
                      >
                        Review or log expenses
                      </Link>
                    </div>
                    {FIELD_DETAILS.filter(
                      field =>
                        field.key !== "costPerMile" || costMode === "mileage"
                    ).map(field => {
                      const fieldValid =
                        validNumber(assumptions[field.key]) &&
                        (field.key !== "taxReservePercent" ||
                          Number(assumptions[field.key]) < 100);
                      return (
                        <div key={field.key}>
                          <Label htmlFor={`insight-${field.key}`}>
                            {field.label}
                          </Label>
                          <Input
                            id={`insight-${field.key}`}
                            type="number"
                            inputMode="decimal"
                            min="0"
                            max={
                              field.key === "taxReservePercent"
                                ? "99.99"
                                : undefined
                            }
                            step="any"
                            value={assumptions[field.key]}
                            className="mt-2 min-h-11 max-w-60"
                            aria-describedby={`insight-${field.key}-hint${fieldValid ? "" : ` insight-${field.key}-error`}`}
                            aria-invalid={!fieldValid}
                            onChange={event =>
                              setAssumptions(previous => ({
                                ...previous,
                                [field.key]: event.target.value,
                              }))
                            }
                          />
                          <p
                            id={`insight-${field.key}-hint`}
                            className="mt-2 text-xs leading-relaxed text-muted-foreground"
                          >
                            {field.hint}
                          </p>
                          {!fieldValid && (
                            <p
                              id={`insight-${field.key}-error`}
                              className="mt-2 text-xs text-destructive"
                            >
                              {field.key === "taxReservePercent"
                                ? "Enter a reserve from 0% to less than 100%."
                                : "Enter zero or a positive number."}
                            </p>
                          )}
                        </div>
                      );
                    })}
                    <div className="rounded-xl border bg-muted/20 p-4 text-xs leading-relaxed text-muted-foreground">
                      <strong className="text-foreground">
                        Actual costs and tax deductions are different.
                      </strong>{" "}
                      Neither cost mode uses the IRS mileage rate. An IRS
                      mileage deduction reduces taxable income; it is not a
                      reimbursement or a substitute for actual vehicle costs.
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-primary/30">
                  <CardContent className="p-5 sm:p-6">
                    {!result ? (
                      <div role="status" className="py-8">
                        <h2 className="text-xl font-semibold">
                          {calculation.overflow
                            ? "These values are too large"
                            : "Check your assumptions"}
                        </h2>
                        <p className="mt-3 text-sm text-muted-foreground">
                          Enter valid values to update your estimate. No hourly
                          result is shown while an assumption is incomplete.
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-muted-foreground">
                          After estimated costs and reserve
                        </p>
                        <h2
                          className={`mt-3 text-4xl font-semibold tracking-tight tabular-nums ${result.takeHome < 0 ? "text-destructive" : ""}`}
                        >
                          {usd(result.takeHome)}
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Estimated amount left from the included recorded work
                        </p>
                        <dl className="my-6 space-y-3 text-sm">
                          {(
                            [
                              ["Included earnings", data.tracked.earnings],
                              [
                                "Mileage vehicle cost estimate",
                                -result.vehicleCost,
                              ],
                              [
                                costMode === "mileage"
                                  ? "Saved nonvehicle expenses"
                                  : "All saved expenses",
                                -savedCosts,
                              ],
                              [
                                "Extra unlogged costs",
                                -Number(assumptions.otherCosts),
                              ],
                              ["Operating profit", result.operatingProfit],
                              [
                                `Planning tax reserve (${settings.taxReservePercent}%)`,
                                -result.taxReserve,
                              ],
                            ] as const
                          ).map(([label, value]) => (
                            <div
                              key={label}
                              className="flex justify-between gap-3"
                            >
                              <dt className="text-muted-foreground">{label}</dt>
                              <dd className="font-medium tabular-nums">
                                {usd(value)}
                              </dd>
                            </div>
                          ))}
                        </dl>
                        <div className="border-t pt-5">
                          <p
                            className={`text-3xl font-semibold tabular-nums ${result.hourly! < 0 ? "text-destructive" : ""}`}
                          >
                            {usd(result.hourly!)}
                            <span className="ml-1 text-base font-normal text-muted-foreground">
                              per recorded hour
                            </span>
                          </p>
                          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                            Total estimated amount left ÷ total recorded hours.
                            Hours across sources are weighted by their duration.
                          </p>
                        </div>
                        <div className="mt-5 rounded-xl bg-muted/40 p-4">
                          <h3 className="font-semibold">
                            {result.earningsGap! > 0.005
                              ? `${usd(result.earningsGap!)} below your goal`
                              : "Your recorded work meets your goal"}
                          </h3>
                          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                            {result.earningsGap! > 0.005
                              ? `At these same hours and costs, you would need ${usd(result.requiredEarnings!)} in total earnings to keep ${usd(settings.targetHourly)} per hour after reserve.`
                              : `Your chosen goal is ${usd(settings.targetHourly)} per hour after costs and reserve.`}
                          </p>
                        </div>
                        {result.operatingProfit < 0 && (
                          <p className="mt-4 text-sm text-destructive">
                            Your entered costs exceed earnings for this period.
                            The loss stays visible; no tax reserve is added to a
                            loss.
                          </p>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
              {valid && sources.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Layers3 className="h-5 w-5 text-primary" />
                      Which work paid best?
                    </CardTitle>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      Comparison before unallocated expenses and your tax
                      reserve.
                      {costMode === "mileage"
                        ? " Vehicle costs use your chosen mileage estimate."
                        : " No costs are allocated to individual sources in recorded-expense mode."}{" "}
                      Saved expenses and extra unlogged costs affect only the
                      overall result. They are not assigned to a source, so this
                      ranking does not show each source’s complete profit.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 sm:hidden">
                      {sources.map((source, index) => (
                        <article
                          key={source.source}
                          className="rounded-xl border p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <h3 className="min-w-0 flex-1 break-words font-medium">
                              {source.source}
                            </h3>
                            <p
                              className={`shrink-0 font-semibold tabular-nums ${source.profit.operatingProfit < 0 ? "text-destructive" : ""}`}
                            >
                              {usd(
                                source.profit.operatingProfit / source.hours
                              )}
                              /hr
                            </p>
                          </div>
                          {index === 0 && sources.length > 1 && (
                            <Badge
                              variant="outline"
                              className="mt-2 border-primary/30 text-primary"
                            >
                              Highest recorded rate
                            </Badge>
                          )}
                          <p className="mt-3 text-xs text-muted-foreground">
                            {source.records} session
                            {source.records === 1 ? "" : "s"} ·{" "}
                            {decimal(source.hours)} hours ·{" "}
                            {decimal(source.miles)} mi
                          </p>
                          <p className="mt-2 text-sm">
                            {usd(source.profit.operatingProfit)} operating
                            profit
                          </p>
                        </article>
                      ))}
                    </div>
                    <div className="hidden overflow-x-auto sm:block">
                      <table className="w-full text-left text-sm">
                        <caption className="sr-only">
                          Recorded income source comparison before reserve and
                          unallocated period costs
                        </caption>
                        <thead className="border-b text-muted-foreground">
                          <tr>
                            <th className="py-3 pr-4">Income source</th>
                            <th className="px-3 py-3">Recorded hours</th>
                            <th className="px-3 py-3">Operating profit</th>
                            <th className="py-3 pl-3 text-right">
                              Profit per hour
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sources.map((source, index) => (
                            <tr
                              key={source.source}
                              className="border-b last:border-0"
                            >
                              <th scope="row" className="py-4 pr-4 font-medium">
                                <p className="break-words">{source.source}</p>
                                <p className="mt-1 text-xs font-normal text-muted-foreground">
                                  {source.records} recorded session
                                  {source.records === 1 ? "" : "s"}
                                </p>
                                {index === 0 && sources.length > 1 && (
                                  <p className="mt-2 text-xs font-normal text-primary">
                                    Highest recorded rate
                                  </p>
                                )}
                              </th>
                              <td className="px-3 py-4 tabular-nums">
                                {decimal(source.hours)} h
                              </td>
                              <td className="px-3 py-4 tabular-nums">
                                {usd(source.profit.operatingProfit)}
                              </td>
                              <td
                                className={`py-4 pl-3 text-right font-semibold tabular-nums ${source.profit.operatingProfit < 0 ? "text-destructive" : ""}`}
                              >
                                {usd(
                                  source.profit.operatingProfit / source.hours
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
                      A result from one session is a small sample. These figures
                      describe your recorded past work, not future demand or
                      guaranteed earnings. Include all waiting and
                      administrative time, and avoid counting overlapping
                      multi-app hours twice.
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
          <section className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            <p>
              Review the earnings behind these figures in{" "}
              <Link
                href="/money-manager"
                className="font-medium text-primary underline underline-offset-4"
              >
                Earnings & mileage
              </Link>
              . Add missing completed work there, and review saved costs in{" "}
              <Link
                href="/work-expenses"
                className="font-medium text-primary underline underline-offset-4"
              >
                Expenses
              </Link>
              , or{" "}
              <Link
                href="/tools/gig-hourly-rate"
                className="font-medium text-primary underline underline-offset-4"
              >
                compare a different work scenario
              </Link>
              .
            </p>
            <p className="mt-2 text-xs">
              The reserve is a planning allowance. Actual tax depends on
              deductions, other income, filing status and location.
            </p>
          </section>
        </>
      ) : null}
    </DashboardPageShell>
  );
}
