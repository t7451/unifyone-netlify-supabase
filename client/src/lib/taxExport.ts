/** Client downloads for the owner-scoped, Pro-gated accountant records endpoint. */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";

export type TaxReport =
  inferRouterOutputs<AppRouter>["moneyManager"]["exportTaxReport"];
const fmtUsd = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value
  );
const fmtNumber = (value: number) =>
  value.toLocaleString("en-US", { maximumFractionDigits: 2 });
export function formatTaxReportMileageRates(
  report: Pick<TaxReport, "mileageRatePeriods">
): string {
  return report.mileageRatePeriods
    .map(
      period =>
        `${period.startDate} to ${period.endDate}: $${(period.rateCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 3 })}/mi`
    )
    .join("; ");
}
function fmtDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

/** Neutralize formulas even after leading whitespace/control characters, in every string column. */
export function escapeAccountantCsvCell(value: string | number): string {
  let normalized = String(value ?? "").replace(/\r\n|\n|\r/g, " ");
  // Spreadsheet engines ignore leading whitespace and some control characters.
  // eslint-disable-next-line no-control-regex
  const dangerousPrefix = /^[\s\u0000-\u001f]*[=+\-@]|^[\u0000-\u001f]/;
  if (typeof value === "string" && dangerousPrefix.test(normalized))
    normalized = `'${normalized}`;
  return /[",\n]/.test(normalized)
    ? `"${normalized.replace(/"/g, '""')}"`
    : normalized;
}
export const ACCOUNTANT_RECORDS_NOTE =
  "Records for review, not a tax return or a calculated tax bill. Imported earnings may overlap work records; duplicate earnings have not been reconciled. Linked provider activity and bank deposits are excluded. Recorded expenses are self-reported and may be incomplete. Do not claim actual vehicle expenses and the standard mileage deduction for the same vehicle costs; review eligibility and method with your preparer.";
type Section = {
  title: string;
  columns: string[];
  rows: (string | number)[][];
};
function sections(report: TaxReport): Section[] {
  return [
    {
      title: "Coverage — annual records, USD",
      columns: ["Source", "Records", "Amount (USD)"],
      rows: [
        [
          "Timer work sessions",
          report.coverage.sources.timer.count,
          fmtUsd(report.coverage.sources.timer.totalDollars),
        ],
        [
          "Manually entered work",
          report.coverage.sources.manual.count,
          fmtUsd(report.coverage.sources.manual.totalDollars),
        ],
        [
          "Committed CSV earnings (unreconciled)",
          report.coverage.sources.csv.count,
          fmtUsd(report.coverage.sources.csv.totalDollars),
        ],
        [
          "Recorded expenses",
          report.coverage.sources.expenses.count,
          fmtUsd(report.coverage.sources.expenses.totalDollars),
        ],
        [
          "Saved mileage log rows",
          report.coverage.mileage.count,
          "See mileage summary; work-only miles can also contribute",
        ],
      ],
    },
    {
      title: "Bookkeeping subtotals — overlaps not reconciled",
      columns: ["Measure", "Value (USD unless noted)"],
      rows: [
        [
          "Work-record earnings only",
          fmtUsd(report.summary.totalEarningsDollars),
        ],
        [
          "CSV earnings, separately recorded",
          fmtUsd(report.coverage.sources.csv.totalDollars),
        ],
        [
          "Combined recorded income (may contain duplicates)",
          fmtUsd(report.bookkeeping.recordedIncomeDollars),
        ],
        [
          "Recorded expenses (not a tax deductibility decision)",
          fmtUsd(report.bookkeeping.recordedExpenseDollars),
        ],
        [
          "Income minus recorded expenses (unreconciled)",
          fmtUsd(report.bookkeeping.incomeAfterRecordedExpensesDollars),
        ],
        [
          "Business miles, deduplicated work/log total",
          fmtNumber(report.coverage.mileage.totalMiles),
        ],
        [
          "Mileage deduction estimate, separate from expenses",
          fmtUsd(report.coverage.mileage.deductionDollars),
        ],
      ],
    },
    {
      title: "Work session ledger — timer and manual",
      columns: [
        "Date (UTC)",
        "Source",
        "Platform",
        "Hours",
        "Gross USD",
        "Tips USD",
        "Bonus USD",
        "Total USD",
        "Miles",
      ],
      rows: report.shifts.map(row => [
        fmtDate(row.date),
        row.source,
        row.platform,
        row.durationHours === null ? "Not supplied" : row.durationHours,
        row.grossDollars.toFixed(2),
        row.tipsDollars.toFixed(2),
        row.bonusesDollars.toFixed(2),
        row.totalDollars.toFixed(2),
        row.miles,
      ]),
    },
    {
      title: "Committed CSV earnings — not reconciled with work sessions",
      columns: [
        "Date (UTC)",
        "Batch",
        "Platform",
        "Hours",
        "Gross USD",
        "Tips USD",
        "Bonus USD",
        "Total USD",
        "Miles",
      ],
      rows: report.imports.map(row => [
        fmtDate(row.date),
        row.batchId,
        row.platform,
        "Not supplied",
        row.grossDollars.toFixed(2),
        row.tipsDollars.toFixed(2),
        row.bonusesDollars.toFixed(2),
        row.totalDollars.toFixed(2),
        row.miles === null ? "Not supplied" : row.miles,
      ]),
    },
    {
      title: "Recorded expense ledger — local calendar dates",
      columns: ["Date", "Category", "Amount USD", "Merchant", "Notes"],
      rows: report.expenses.map(row => [
        row.date,
        row.category,
        (row.amountCents / 100).toFixed(2),
        row.merchant ?? "",
        row.notes ?? "",
      ]),
    },
    {
      title: "Saved mileage ledger — original stored rates",
      columns: [
        "Date",
        "Miles",
        "Purpose",
        "Rate USD/mi",
        "Deduction USD",
        "Total treatment",
        "From",
        "To",
      ],
      rows: report.mileageLogs.map(row => [
        fmtDate(row.date),
        row.miles,
        row.purpose,
        (row.rateCents / 100).toFixed(3),
        row.deductionDollars.toFixed(2),
        row.includedSeparately
          ? "Added separately"
          : "Included with work session",
        row.startAddress,
        row.endAddress,
      ]),
    },
  ];
}
export function buildAccountantRecordsCsv(report: TaxReport): string {
  const rows: (string | number)[][] = [
    [`UnifyOne Accountant Records — ${report.year}`],
    ["Generated (UTC)", fmtDate(report.generatedAt)],
    ["Scope", ACCOUNTANT_RECORDS_NOTE],
    ["IRS business mileage periods", formatTaxReportMileageRates(report)],
    [
      "Mileage basis",
      "Saved mileage rows retain original rates and deductions. Work-only mileage may contribute to totals without a separate log row. Mileage deductions are not subtracted from the bookkeeping subtotal.",
    ],
    ...report.coverage.exclusions.map(note => ["Excluded", note]),
    ...report.coverage.warnings.map(note => ["Review", note]),
  ];
  for (const section of sections(report))
    rows.push(
      [],
      [section.title],
      section.columns,
      ...(section.rows.length ? section.rows : [["No records for this year"]])
    );
  return rows
    .map(row => row.map(escapeAccountantCsvCell).join(","))
    .join("\r\n");
}
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function downloadTaxCsv(report: TaxReport): void {
  triggerDownload(
    new Blob([buildAccountantRecordsCsv(report)], {
      type: "text/csv;charset=utf-8;",
    }),
    `unifyone-accountant-records-${report.year}.csv`
  );
}
interface DocWithAutoTable extends jsPDF {
  lastAutoTable?: { finalY: number };
}
export function downloadTaxPdf(report: TaxReport): void {
  const doc = new jsPDF() as DocWithAutoTable;
  const margin = 14;
  let y = 18;
  const paragraph = (text: string, size = 9) => {
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, 180) as string[];
    for (const line of lines) {
      if (y > 275) {
        doc.addPage();
        y = 18;
      }
      doc.text(line, margin, y);
      y += size * 0.45 + 1;
    }
    y += 3;
  };
  paragraph(`UnifyOne Accountant Records - ${report.year}`, 17);
  paragraph(`Generated ${fmtDate(report.generatedAt)} (UTC). Currency: USD.`);
  paragraph(ACCOUNTANT_RECORDS_NOTE);
  paragraph(
    `IRS business mileage periods: ${formatTaxReportMileageRates(report)}`,
    8
  );
  paragraph(
    "Stored mileage rates are preserved. Work-only miles may contribute without a separate saved log row. Mileage deductions are not subtracted from the bookkeeping subtotal.",
    8
  );
  for (const note of report.coverage.exclusions)
    paragraph(`Excluded: ${note}`, 8);
  for (const note of report.coverage.warnings) paragraph(`Review: ${note}`, 8);
  for (const section of sections(report)) {
    if (y > 245) {
      doc.addPage();
      y = 18;
    }
    autoTable(doc, {
      startY: y,
      margin: { top: 14, bottom: 18, left: margin, right: margin },
      head: [
        [{ content: section.title, colSpan: section.columns.length }],
        section.columns,
      ],
      body: section.rows.length
        ? section.rows.map(row => row.map(String))
        : [
            [
              {
                content: "No records for this year",
                colSpan: section.columns.length,
              },
            ],
          ],
      theme: "striped",
      headStyles: { fillColor: [55, 55, 55] },
      styles: { fontSize: 7, overflow: "linebreak", cellPadding: 2 },
      showHead: "everyPage",
      rowPageBreak: "avoid",
    });
    y = (doc.lastAutoTable?.finalY ?? y) + 8;
  }
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(
      `Accountant records ${report.year} | USD | ${page} / ${pages}`,
      margin,
      289
    );
  }
  doc.save(`unifyone-accountant-records-${report.year}.pdf`);
}
