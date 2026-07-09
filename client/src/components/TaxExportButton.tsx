/**
 * client/src/components/TaxExportButton.tsx
 *
 * Drop-in control for the Pro "Tax Export" feature. It reads the user's gate
 * status (gigWorker.checkFeatureAccess) and either offers CSV/PDF downloads or
 * an upgrade CTA. Fetching the report is on-demand (not a standing query) so a
 * Starter operator never pulls the data, and the server re-checks the gate
 * anyway — this component only decides what to show.
 */
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { Download, FileSpreadsheet, FileText, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

type ExportFormat = "csv" | "pdf";

export function TaxExportButton({
  year,
  className,
}: {
  year?: number;
  className?: string;
}) {
  const utils = trpc.useUtils();
  const access = trpc.gigWorker.checkFeatureAccess.useQuery({
    feature: "tax_export",
  });
  const [busy, setBusy] = useState<ExportFormat | null>(null);

  async function handleExport(format: ExportFormat) {
    if (busy) return;
    setBusy(format);
    try {
      const report = await utils.moneyManager.exportTaxReport.fetch(
        year ? { year } : undefined
      );
      // Load the (heavy) PDF/CSV generator on demand so jsPDF never ships in
      // the eager gig-page bundle — only when an operator actually exports.
      const { downloadTaxCsv, downloadTaxPdf } = await import(
        "@/lib/taxExport"
      );
      if (format === "csv") downloadTaxCsv(report);
      else downloadTaxPdf(report);
      toast.success(`Tax report exported (${format.toUpperCase()})`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not export tax report"
      );
    } finally {
      setBusy(null);
    }
  }

  // While the gate resolves, render nothing rather than flashing a wrong state.
  if (access.isLoading) return null;

  if (!access.data?.hasAccess) {
    return (
      <Button
        asChild
        size="sm"
        variant="outline"
        className={cn(
          "border-violet-500/40 text-violet-200 hover:bg-violet-500/10",
          className
        )}
      >
        <Link href="/gig-worker-plans">
          <Lock className="mr-1.5 h-3.5 w-3.5" />
          Unlock tax export — Pro
        </Link>
      </Button>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="hidden text-xs text-muted-foreground sm:inline">
        <Download className="mr-1 inline h-3.5 w-3.5" />
        Tax export
      </span>
      <Button
        size="sm"
        variant="outline"
        disabled={busy !== null}
        onClick={() => handleExport("pdf")}
      >
        <FileText className="mr-1.5 h-3.5 w-3.5" />
        {busy === "pdf" ? "Exporting…" : "PDF"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={busy !== null}
        onClick={() => handleExport("csv")}
      >
        <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
        {busy === "csv" ? "Exporting…" : "CSV"}
      </Button>
    </div>
  );
}
