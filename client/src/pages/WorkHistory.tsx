import { useEffect, useState, type FormEvent } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  CalendarRange,
  Clock3,
  FileUp,
  Filter,
  RefreshCw,
  Search,
  Wallet,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import ManualWorkEntry from "@/components/ManualWorkEntry";
import { DashboardPageShell } from "@/components/DashboardPageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

const PAGE_SIZE = 25;
const usd = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value
  );
const amount = (value: number) =>
  value.toLocaleString("en-US", { maximumFractionDigits: 2 });
const localDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
function calendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1900 || year > 9999) return null;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : null;
}
function dateRange(start: string, end: string) {
  const from = calendarDate(start);
  const until = calendarDate(end);
  if (!from || !until || from > until) return null;
  // Advance the calendar, not 24 hours: local DST days can have 23 or 25 hours.
  const before = new Date(
    until.getFullYear(),
    until.getMonth(),
    until.getDate() + 1
  );
  if (!Number.isFinite(before.getTime())) return null;
  return {
    from: from.toISOString(),
    before: before.toISOString(),
    fromDate: start,
    beforeDate: localDate(before),
  };
}
function initialDates() {
  const today = new Date();
  return {
    start: localDate(new Date(today.getFullYear(), today.getMonth(), 1)),
    end: localDate(today),
  };
}
function dateLabel(value: string) {
  return (
    calendarDate(value)?.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) ?? value
  );
}
function workingTime(hours: number | null) {
  if (hours === null) return "Hours not provided";
  if (hours > 0 && hours < 1) return `${amount(hours * 60)} min recorded`;
  return `${amount(hours)} h recorded`;
}
const originLabels = {
  manual: "Added manually",
  timer: "Timed session",
  import: "Statement import",
};

export default function WorkHistory() {
  const utils = trpc.useUtils();
  const [defaults] = useState(initialDates);
  const [start, setStart] = useState(defaults.start);
  const [end, setEnd] = useState(defaults.end);
  const [source, setSource] = useState("");
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState({
    ...defaults,
    source: "",
    query: "",
  });
  const [offset, setOffset] = useState(0);
  const [notice, setNotice] = useState("");
  const [timeZone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const appliedRange = dateRange(applied.start, applied.end)!;
  const chosenRange = dateRange(start, end);
  const valid =
    !!chosenRange &&
    end <= localDate(new Date()) &&
    source.length <= 100 &&
    query.trim().length <= 100;
  const history = trpc.workHistory.list.useQuery(
    {
      ...appliedRange,
      ...(applied.source ? { source: applied.source } : {}),
      ...(applied.query ? { query: applied.query } : {}),
      limit: PAGE_SIZE,
      offset,
    },
    { retry: false }
  );
  const data = history.data;
  const sourceOptions = data?.sources ?? [];
  const hasMissingSelectedSource = source && !sourceOptions.includes(source);
  const dirty =
    start !== applied.start ||
    end !== applied.end ||
    source !== applied.source ||
    query.trim() !== applied.query;

  useEffect(() => {
    if (data && offset > 0 && offset >= data.totalEntries)
      setOffset(
        Math.max(0, Math.floor((data.totalEntries - 1) / PAGE_SIZE) * PAGE_SIZE)
      );
  }, [data, offset]);

  function apply(event: FormEvent) {
    event.preventDefault();
    if (!valid || history.isFetching) return;
    setApplied({ start, end, source, query: query.trim() });
    setOffset(0);
    setNotice("");
  }
  function reset() {
    const dates = initialDates();
    setStart(dates.start);
    setEnd(dates.end);
    setSource("");
    setQuery("");
    setApplied({ ...dates, source: "", query: "" });
    setOffset(0);
    setNotice("");
  }
  function saved() {
    setNotice(
      "Work saved. Your history is refreshing; an entry can move or leave this view when its date or source changes."
    );
    void utils.workHistory.list.invalidate();
  }

  return (
    <DashboardPageShell
      eyebrow="Find the work behind your numbers"
      title="Work history"
      description="Review completed sessions and imported earnings together. Find a platform, client or date without losing track of where each record came from."
      meta={
        <Badge
          variant="outline"
          className="border-border text-muted-foreground"
        >
          Completed work and statement imports · USD
        </Badge>
      }
      actions={<ManualWorkEntry onSaved={saved} />}
    >
      <section
        className="rounded-2xl border bg-card p-4 sm:p-6"
        aria-labelledby="history-filters-heading"
      >
        <h2
          id="history-filters-heading"
          className="flex items-center gap-2 text-lg font-semibold"
        >
          <Filter className="h-4 w-4 text-primary" />
          Find your records
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Start and end days are inclusive. Timed and manual sessions use this
          device’s time zone: {timeZone}. Statement imports use their saved
          statement calendar date (UTC), so a statement date does not shift to
          the previous day. Apply filters to update the records and totals.
        </p>
        <form onSubmit={apply} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <Label htmlFor="history-start">Start date</Label>
              <Input
                id="history-start"
                type="date"
                min="1900-01-01"
                max={localDate(new Date())}
                value={start}
                onChange={event => setStart(event.target.value)}
                className="mt-2 min-h-11"
                aria-invalid={!chosenRange}
                aria-describedby={
                  !chosenRange ? "history-date-error" : undefined
                }
              />
            </div>
            <div>
              <Label htmlFor="history-end">End date</Label>
              <Input
                id="history-end"
                type="date"
                min="1900-01-01"
                max={localDate(new Date())}
                value={end}
                onChange={event => setEnd(event.target.value)}
                className="mt-2 min-h-11"
                aria-invalid={!chosenRange || end > localDate(new Date())}
                aria-describedby={
                  !chosenRange || end > localDate(new Date())
                    ? "history-date-error"
                    : undefined
                }
              />
            </div>
            <div>
              <Label htmlFor="history-source">Income source</Label>
              <select
                id="history-source"
                className="mt-2 min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={source}
                onChange={event => setSource(event.target.value)}
              >
                <option value="">All income sources</option>
                {hasMissingSelectedSource && (
                  <option value={source}>{source} (no current records)</option>
                )}
                {sourceOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="history-search">Search platform or client</Label>
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="history-search"
                  value={query}
                  maxLength={100}
                  onChange={event => setQuery(event.target.value)}
                  className="min-h-11 pl-9"
                  placeholder="Part of a source name"
                />
              </div>
            </div>
          </div>
          {(!chosenRange || end > localDate(new Date())) && (
            <p
              id="history-date-error"
              role="alert"
              className="text-sm text-destructive"
            >
              Choose valid dates with the end on or after the start, through
              today.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="submit"
              disabled={!valid || history.isFetching}
              className="min-h-11"
            >
              Apply filters
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={history.isFetching}
              onClick={reset}
              className="min-h-11"
            >
              Reset to this month
            </Button>
            <span role="status" className="text-xs text-muted-foreground">
              {dirty
                ? "You have unapplied filter changes."
                : "Showing the applied filters."}
            </span>
          </div>
        </form>
      </section>
      {notice && (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 text-sm text-emerald-200"
        >
          {notice}
        </p>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            {dateLabel(applied.start)} – {dateLabel(applied.end)}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {applied.source || "All income sources"}
            {applied.query ? ` · Name contains “${applied.query}”` : ""}.
            Figures cover all matching records, not just this page.
          </p>
        </div>
        <Button
          variant="ghost"
          className="min-h-11"
          disabled={history.isFetching}
          onClick={() => void history.refetch()}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${history.isFetching ? "animate-spin" : ""}`}
          />
          {history.isFetching ? "Refreshing…" : "Refresh history"}
        </Button>
      </div>
      {history.isLoading ? (
        <section
          role="status"
          aria-label="Loading work history"
          className="space-y-3"
        >
          <p className="text-sm text-muted-foreground">
            Loading matching work records…
          </p>
          {[1, 2, 3].map(value => (
            <Skeleton key={value} className="h-28 w-full rounded-xl" />
          ))}
        </section>
      ) : history.isError ? (
        <Card className="border-destructive/30">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold">
              Work history could not load
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Your recorded work has not changed. Try again to retrieve the
              selected period.
            </p>
            <Button
              variant="outline"
              className="mt-4 min-h-11"
              onClick={() => void history.refetch()}
            >
              Retry history
            </Button>
          </CardContent>
        </Card>
      ) : data ? (
        <>
          <section
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
            aria-label="Totals for all filtered records"
          >
            {[
              {
                label: "Filtered earnings",
                value: usd(data.totalEarningsUSD),
                helper: `${data.totalEntries} matching record${data.totalEntries === 1 ? "" : "s"} · before costs and tax`,
                icon: Wallet,
              },
              {
                label: "Recorded hours",
                value:
                  data.totalRecordedHours > 0
                    ? `${amount(data.totalRecordedHours)} h`
                    : "—",
                helper: data.unknownHoursCount
                  ? `${data.unknownHoursCount} record${data.unknownHoursCount === 1 ? " has" : "s have"} no reliable hours`
                  : "Only completed work with recorded duration",
                icon: Clock3,
              },
              {
                label: "Recorded business miles",
                value:
                  data.totalRecordedMiles > 0 ||
                  data.unknownMilesCount < data.totalEntries
                    ? `${amount(data.totalRecordedMiles)} mi`
                    : "—",
                helper: data.unknownMilesCount
                  ? `${data.unknownMilesCount} record${data.unknownMilesCount === 1 ? " has" : "s have"} no mileage provided`
                  : "Known mileage in the matching records",
                icon: CalendarRange,
              },
              {
                label: "Matching records",
                value: String(data.totalEntries),
                helper: "Manual entries, timed work and statement imports",
                icon: FileUp,
              },
            ].map(stat => (
              <Card key={stat.label}>
                <CardContent className="p-4 sm:p-5">
                  <p className="flex justify-between gap-2 text-sm text-muted-foreground">
                    {stat.label}
                    <stat.icon className="h-4 w-4 shrink-0 text-primary" />
                  </p>
                  <p className="mt-3 text-2xl font-semibold tabular-nums">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {stat.helper}
                  </p>
                </CardContent>
              </Card>
            ))}
          </section>
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs leading-relaxed text-muted-foreground">
            Each entry keeps its recorded origin. Statement imports do not
            provide reliable work hours, and a statement can include income you
            already recorded manually. This history does not automatically
            reconcile overlaps. Bank and linked-provider activity remains
            separate in{" "}
            <Link
              href="/connected-money"
              className="font-medium text-primary underline underline-offset-4"
            >
              Connected accounts
            </Link>
            .
          </div>
          {!data.entries.length ? (
            <Card>
              <CardContent className="p-6 sm:p-8">
                <h3 className="text-xl font-semibold">
                  No work matches these filters
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  Try a wider date range or another source. You can also add an
                  unrecorded completed session or review your statement imports.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    className="min-h-11"
                    onClick={reset}
                  >
                    Show this month’s work
                  </Button>
                  <Link
                    href="/money-manager?tab=import"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium"
                  >
                    <FileUp className="h-4 w-4" />
                    Review statement imports
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <section aria-label="Matching work entries" className="space-y-3">
              {data.entries.map(entry => (
                <article
                  key={`${entry.kind}:${entry.id}`}
                  className="rounded-2xl border bg-card p-4 sm:p-5"
                  aria-label={`${entry.source} work record`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="min-w-0 break-words font-semibold">
                          {entry.source}
                        </h3>
                        <Badge variant="outline">
                          {originLabels[entry.kind]}
                        </Badge>
                        {entry.importBatchId !== null && (
                          <span className="text-xs text-muted-foreground">
                            Batch #{entry.importBatchId}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        <time
                          dateTime={
                            entry.kind === "import"
                              ? entry.startedAt.slice(0, 10)
                              : entry.startedAt
                          }
                        >
                          {entry.kind === "import"
                            ? dateLabel(entry.startedAt.slice(0, 10))
                            : new Date(entry.startedAt).toLocaleString(
                                undefined,
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                }
                              )}
                        </time>
                        {entry.kind === "import" && (
                          <span className="ml-2 text-xs">
                            Statement date (UTC)
                          </span>
                        )}
                      </p>
                    </div>
                    <p className="shrink-0 text-xl font-semibold tabular-nums">
                      {usd(entry.earningsUSD)}
                    </p>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                    <p className="text-sm text-muted-foreground">
                      {workingTime(entry.hours)} ·{" "}
                      {entry.miles === null
                        ? "Miles not provided"
                        : `${amount(entry.miles)} mi`}
                      <span className="mt-1 block text-xs">
                        Base {usd(entry.base)} · Tips {usd(entry.tips)} ·
                        Bonuses {usd(entry.bonuses)}
                      </span>
                    </p>
                    {entry.kind === "manual" ? (
                      <ManualWorkEntry
                        editRecordId={entry.id}
                        editLabel={`Edit manual entry for ${entry.source}`}
                        onSaved={saved}
                      />
                    ) : entry.kind === "import" ? (
                      <Link
                        href="/money-manager?tab=import"
                        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary"
                      >
                        Review imports <ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Completed timer record
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </section>
          )}
          {data.totalEntries > 0 && (
            <nav
              aria-label="Work history pages"
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <Button
                variant="outline"
                className="min-h-11"
                disabled={offset === 0 || history.isFetching}
                onClick={() =>
                  setOffset(value => Math.max(0, value - PAGE_SIZE))
                }
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>
              <p role="status" className="text-sm text-muted-foreground">
                {offset + 1}–{Math.min(offset + PAGE_SIZE, data.totalEntries)}{" "}
                of {data.totalEntries} records
              </p>
              <Button
                variant="outline"
                className="min-h-11"
                disabled={
                  offset + PAGE_SIZE >= data.totalEntries || history.isFetching
                }
                onClick={() => setOffset(value => value + PAGE_SIZE)}
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </nav>
          )}
          <p className="text-xs leading-relaxed text-muted-foreground">
            Need to compare what this work paid after costs? Open{" "}
            <Link
              href="/work-insights"
              className="font-medium text-primary underline underline-offset-4"
            >
              What your work pays
            </Link>
            . Manual entries can be edited here; timer records and statement
            imports retain their original source.
          </p>
        </>
      ) : null}
    </DashboardPageShell>
  );
}
