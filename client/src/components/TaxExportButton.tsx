import { useRef, useState } from "react";
import { Link } from "wouter";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Lock,
  RefreshCw,
} from "lucide-react";
import { BUSINESS_MILEAGE_RATE_PERIODS } from "@shared/mileageRates";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import type { TaxReport } from "@/lib/taxExport";

type ExportFormat = "csv" | "pdf";
const usd = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value
  );
export function TaxExportButton({
  year,
  className,
}: {
  year?: number;
  className?: string;
}) {
  const utils = trpc.useUtils();
  const access = trpc.gigWorker.checkFeatureAccess.useQuery(
    { feature: "tax_export" },
    { retry: false }
  );
  const currentYear = new Date().getUTCFullYear();
  const supportedYears = Array.from(
    new Set(
      BUSINESS_MILEAGE_RATE_PERIODS.map(period =>
        Number(period.startDate.slice(0, 4))
      )
    )
  )
    .filter(value => value <= currentYear)
    .sort((a, b) => b - a);
  const [selectedYear, setSelectedYear] = useState(year ?? currentYear);
  const requestVersion = useRef(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<TaxReport | null>(null);
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState<string | null>(null);
  async function loadRecords(reportYear = selectedYear) {
    const version = ++requestVersion.current;
    setError(null);
    setReport(null);
    setDownloaded(null);
    if (!supportedYears.includes(reportYear)) {
      setLoading(false);
      setError("Choose a supported report year before loading records.");
      return;
    }
    setLoading(true);
    try {
      const nextReport = await utils.moneyManager.exportTaxReport.fetch({
        year: reportYear,
      });
      if (version !== requestVersion.current) return;
      if (nextReport.year !== reportYear)
        throw new Error("Report year did not match the request");
      setReport(nextReport);
    } catch {
      if (version === requestVersion.current)
        setError(
          "We could not load your accountant records. Try again to review coverage before downloading."
        );
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }
  async function download(format: ExportFormat) {
    if (!report || busy) return;
    setBusy(format);
    setError(null);
    try {
      const { downloadTaxCsv, downloadTaxPdf } = await import(
        "@/lib/taxExport"
      );
      if (format === "csv") downloadTaxCsv(report);
      else downloadTaxPdf(report);
      setDownloaded(`${format.toUpperCase()} download prepared.`);
    } catch {
      setError(
        "The download could not be prepared. Your saved records have not changed. Try the download again."
      );
    } finally {
      setBusy(null);
    }
  }
  if (access.isLoading)
    return (
      <span
        className={cn("text-xs text-muted-foreground", className)}
        role="status"
      >
        Checking records export access…
      </span>
    );
  if (access.isError || typeof access.data?.hasAccess !== "boolean")
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        <span className="text-xs text-muted-foreground" role="status">
          Records export access could not load.
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void access.refetch()}
        >
          Retry export access
        </Button>
      </div>
    );
  if (!access.data?.hasAccess)
    return (
      <Button
        asChild
        size="sm"
        variant="outline"
        className={cn(
          "min-h-11 border-violet-500/40 text-violet-200 hover:bg-violet-500/10",
          className
        )}
      >
        <Link href="/gig-worker-plans">
          <Lock className="mr-1.5 h-3.5 w-3.5" />
          Export records · Pro
        </Link>
      </Button>
    );
  return (
    <Dialog
      open={open}
      onOpenChange={value => {
        setOpen(value);
        if (value) void loadRecords();
        else {
          requestVersion.current++;
          setReport(null);
          setLoading(false);
          setError(null);
          setDownloaded(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className={cn("min-h-11", className)}
        >
          <Download className="mr-1.5 h-4 w-4" />
          Export records
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Accountant records
            {` · ${selectedYear}`}
          </DialogTitle>
          <DialogDescription>
            Review what this export includes before downloading. Amounts are in
            USD. This is a set of records for review, not a tax return or a
            calculated tax bill.
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label htmlFor="accountant-records-year">Report year</Label>
          <select
            id="accountant-records-year"
            className="mt-2 min-h-11 w-full rounded-md border bg-background px-3 text-sm sm:max-w-48"
            value={selectedYear}
            disabled={busy !== null}
            onChange={event => {
              const nextYear = Number(event.target.value);
              setSelectedYear(nextYear);
              void loadRecords(nextYear);
            }}
          >
            {!supportedYears.includes(selectedYear) && (
              <option value={selectedYear}>{selectedYear} (unsupported)</option>
            )}
            {supportedYears.map(value => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-muted-foreground">
            Select the calendar year to review and export. Only years with
            verified mileage rates are offered.
          </p>
        </div>
        {loading ? (
          <p className="py-6 text-sm text-muted-foreground" role="status">
            Loading your annual records and coverage…
          </p>
        ) : report ? (
          <>
            <dl
              className="grid gap-3 sm:grid-cols-2"
              aria-label="Export coverage"
            >
              {(
                [
                  ["Timer work sessions", report.coverage.sources.timer],
                  ["Manually entered work", report.coverage.sources.manual],
                  ["Committed CSV earnings", report.coverage.sources.csv],
                  ["Recorded expenses", report.coverage.sources.expenses],
                ] as const
              ).map(([label, source]) => (
                <div key={label} className="rounded-xl border p-3">
                  <dt className="text-sm font-medium">{label}</dt>
                  <dd className="mt-1 text-sm text-muted-foreground">
                    {source.count} record{source.count === 1 ? "" : "s"} ·{" "}
                    {usd(source.totalDollars)}
                  </dd>
                </div>
              ))}
              <div className="rounded-xl border p-3 sm:col-span-2">
                <dt className="text-sm font-medium">Mileage records</dt>
                <dd className="mt-1 text-sm text-muted-foreground">
                  {report.coverage.mileage.count} saved log rows ·{" "}
                  {report.coverage.mileage.totalMiles.toLocaleString("en-US", {
                    maximumFractionDigits: 2,
                  })}{" "}
                  business miles in the deduplicated work/log total ·{" "}
                  {usd(report.coverage.mileage.deductionDollars)} mileage
                  deduction estimate.
                </dd>
                <p className="mt-2 text-xs text-muted-foreground">
                  Work sessions without a separate mileage log can also
                  contribute miles. Saved rates are preserved; date-specific IRS
                  rates apply to work-only estimates.
                </p>
              </div>
            </dl>
            {report.coverage.sources.timer.count +
              report.coverage.sources.manual.count +
              report.coverage.sources.csv.count +
              report.coverage.sources.expenses.count +
              report.coverage.mileage.count ===
              0 && (
              <p className="rounded-xl border p-3 text-sm">
                No records were found for this year. The download will contain
                coverage notes and empty ledgers.{" "}
                <Link href="/money-manager" className="underline">
                  Add missing work or review another year
                </Link>
                .
              </p>
            )}
            <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs leading-relaxed text-muted-foreground">
              <p className="font-semibold text-foreground">
                Coverage and review limits
              </p>
              <p>
                Linked provider activity and bank deposits are excluded.
                Imported CSV earnings may overlap manual or timer records;
                duplicates have not been reconciled. Review overlaps before
                using income totals.
              </p>
              <p>
                Recorded expenses are self-reported and may be incomplete. The
                export lists vehicle expenses and mileage deductions separately;
                do not claim both for the same vehicle costs. No mileage
                deduction is subtracted from the recorded-income-minus-expenses
                subtotal.
              </p>
              <p>
                Work and imported earnings use UTC calendar-year dates. Expenses
                use the dates you recorded. Mileage retains its saved date and
                rate.
              </p>
              {report.coverage.exclusions.map((note, index) => (
                <p key={`exclude-${index}`}>{note}</p>
              ))}
              {report.coverage.warnings.map((note, index) => (
                <p key={`warning-${index}`}>{note}</p>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                disabled={busy !== null}
                onClick={() => void download("csv")}
                className="min-h-11"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                {busy === "csv" ? "Preparing CSV…" : "Download records CSV"}
              </Button>
              <Button
                variant="outline"
                disabled={busy !== null}
                onClick={() => void download("pdf")}
                className="min-h-11"
              >
                <FileText className="mr-2 h-4 w-4" />
                {busy === "pdf" ? "Preparing PDF…" : "Download records PDF"}
              </Button>
              <Button
                variant="ghost"
                disabled={busy !== null}
                onClick={() => void loadRecords()}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh coverage
              </Button>
            </div>
          </>
        ) : null}
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 p-3 text-sm"
          >
            <p>{error}</p>
            {!report && (
              <Button
                variant="outline"
                onClick={() => void loadRecords()}
                className="mt-3 min-h-11"
              >
                Retry loading records
              </Button>
            )}
          </div>
        )}
        {downloaded && (
          <p role="status" className="text-sm text-muted-foreground">
            {downloaded}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
