/**
 * client/src/lib/taxExport.ts
 *
 * Turns the server's structured tax report (moneyManager.exportTaxReport) into
 * downloadable CSV and PDF documents. The report is fetched from a Pro-gated
 * endpoint, so a free operator never reaches these functions with real data —
 * the gate lives on the server.
 */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";

export type TaxReport =
  inferRouterOutputs<AppRouter>["moneyManager"]["exportTaxReport"];

function fmtUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function fmtDate(iso: string): string {
  // YYYY-MM-DD — stable, sortable, CPA-friendly. Guard against bad input.
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function escapeCsvCell(value: string | number): string {
  const normalized = String(value ?? "").replace(/\r?\n|\r/g, " ");
  return /[",\n]/.test(normalized)
    ? `"${normalized.replace(/"/g, '""')}"`
    : normalized;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Build a single CSV containing the summary block, the shift ledger, and the
 * mileage ledger — the record a worker hands to a CPA. Sections are separated
 * by blank lines so the file stays human-readable while remaining valid CSV.
 */
export function downloadTaxCsv(report: TaxReport): void {
  const lines: string[] = [];
  const row = (cells: Array<string | number>) =>
    lines.push(cells.map(escapeCsvCell).join(","));

  row([`UnifyOne Tax Report — ${report.year}`]);
  row(["Generated", fmtDate(report.generatedAt)]);
  row(["IRS mileage rate", `$${report.irsMileageRate.toFixed(2)}/mi`]);
  row([]);

  row(["Summary"]);
  row(["Shifts", report.summary.shiftCount]);
  row(["Gross earnings", report.summary.totalGrossDollars]);
  row(["Tips", report.summary.totalTipsDollars]);
  row(["Bonuses", report.summary.totalBonusesDollars]);
  row(["Total earnings", report.summary.totalEarningsDollars]);
  row(["Total miles", report.summary.totalMiles]);
  row(["Mileage deduction", report.summary.mileageDeductionDollars]);
  row(["Net earnings", report.summary.netEarningsDollars]);
  row([]);

  row(["Estimated tax on recorded net earnings"]);
  row(["Self-employment tax", report.tax.seTaxDollars]);
  row(["Federal income tax (est.)", report.tax.fedIncomeTaxDollars]);
  row(["Total estimated tax", report.tax.totalEstimatedTaxDollars]);
  row([
    `Next quarterly payment due (Q${report.tax.nextQuarter})`,
    fmtDate(report.tax.nextQuarterlyDueDate),
  ]);
  row([]);

  row(["Shift ledger"]);
  row([
    "Date",
    "Platform",
    "Hours",
    "Gross",
    "Tips",
    "Bonuses",
    "Total",
    "Miles",
    "$/hr",
  ]);
  for (const s of report.shifts) {
    row([
      fmtDate(s.date),
      s.platform,
      s.durationHours,
      s.grossDollars,
      s.tipsDollars,
      s.bonusesDollars,
      s.totalDollars,
      s.miles,
      s.perHourDollars,
    ]);
  }
  row([]);

  row(["Mileage ledger"]);
  row(["Date", "Miles", "Purpose", "Deduction", "From", "To"]);
  for (const m of report.mileageLogs) {
    row([
      fmtDate(m.date),
      m.miles,
      m.purpose,
      m.deductionDollars,
      m.startAddress,
      m.endAddress,
    ]);
  }

  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  triggerDownload(blob, `unifyone-tax-report-${report.year}.csv`);
}

/** jspdf-autotable augments the doc with lastAutoTable; type it narrowly. */
interface DocWithAutoTable extends jsPDF {
  lastAutoTable?: { finalY: number };
}

/**
 * Build a formatted one/two-page PDF: header, a totals + tax summary block, and
 * the shift and mileage tables. This is the "at a glance" document the Pro tax
 * export promises.
 */
export function downloadTaxPdf(report: TaxReport): void {
  const doc = new jsPDF() as DocWithAutoTable;
  const marginX = 14;
  let y = 18;

  doc.setFontSize(18);
  doc.text(`UnifyOne Tax Report — ${report.year}`, marginX, y);
  y += 7;
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(
    `Generated ${fmtDate(report.generatedAt)} · IRS mileage rate $${report.irsMileageRate.toFixed(2)}/mi`,
    marginX,
    y
  );
  doc.setTextColor(0);
  y += 8;

  autoTable(doc, {
    startY: y,
    head: [["Summary", ""]],
    body: [
      ["Shifts", String(report.summary.shiftCount)],
      ["Gross earnings", fmtUsd(report.summary.totalGrossDollars)],
      ["Tips", fmtUsd(report.summary.totalTipsDollars)],
      ["Bonuses", fmtUsd(report.summary.totalBonusesDollars)],
      ["Total earnings", fmtUsd(report.summary.totalEarningsDollars)],
      ["Total miles", report.summary.totalMiles.toFixed(1)],
      ["Mileage deduction", fmtUsd(report.summary.mileageDeductionDollars)],
      ["Net earnings", fmtUsd(report.summary.netEarningsDollars)],
    ],
    theme: "striped",
    headStyles: { fillColor: [212, 168, 67] },
    styles: { fontSize: 9 },
  });
  y = (doc.lastAutoTable?.finalY ?? y) + 6;

  autoTable(doc, {
    startY: y,
    head: [["Estimated tax on recorded net earnings", ""]],
    body: [
      ["Self-employment tax", fmtUsd(report.tax.seTaxDollars)],
      ["Federal income tax (est.)", fmtUsd(report.tax.fedIncomeTaxDollars)],
      ["Total estimated tax", fmtUsd(report.tax.totalEstimatedTaxDollars)],
      [
        `Next quarterly payment (Q${report.tax.nextQuarter})`,
        fmtDate(report.tax.nextQuarterlyDueDate),
      ],
    ],
    theme: "striped",
    headStyles: { fillColor: [212, 168, 67] },
    styles: { fontSize: 9 },
  });
  y = (doc.lastAutoTable?.finalY ?? y) + 6;

  if (report.shifts.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Date", "Platform", "Hrs", "Gross", "Tips", "Miles", "$/hr"]],
      body: report.shifts.map(s => [
        fmtDate(s.date),
        s.platform,
        s.durationHours.toFixed(1),
        fmtUsd(s.grossDollars),
        fmtUsd(s.tipsDollars),
        s.miles.toFixed(1),
        fmtUsd(s.perHourDollars),
      ]),
      theme: "grid",
      headStyles: { fillColor: [30, 30, 30] },
      styles: { fontSize: 8 },
    });
    y = (doc.lastAutoTable?.finalY ?? y) + 6;
  }

  if (report.mileageLogs.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Date", "Miles", "Purpose", "Deduction", "From", "To"]],
      body: report.mileageLogs.map(m => [
        fmtDate(m.date),
        m.miles.toFixed(1),
        m.purpose,
        fmtUsd(m.deductionDollars),
        m.startAddress,
        m.endAddress,
      ]),
      theme: "grid",
      headStyles: { fillColor: [30, 30, 30] },
      styles: { fontSize: 8 },
    });
  }

  doc.save(`unifyone-tax-report-${report.year}.pdf`);
}
