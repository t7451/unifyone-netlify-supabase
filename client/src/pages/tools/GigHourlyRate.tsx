import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  ArrowDownToLine,
  ArrowRight,
  Calculator,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import PageHead from "@/components/PageHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SITE_URL } from "@/lib/siteConfig";
import {
  calculateWorkProfit,
  DEFAULT_PROFIT_SETTINGS,
  type ProfitSettings,
  type WorkTotals,
} from "@shared/workProfit";

const CANONICAL = `${SITE_URL}/tools/gig-hourly-rate`;
const usd = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value === 0 ? 0 : value
  );
const roundUpCents = (value: number) => Math.ceil(value * 100 - 1e-8) / 100;
type Row = {
  id: number;
  name: string;
  earnings: string;
  hours: string;
  miles: string;
  otherCosts: string;
};
type SettingsForm = Record<keyof ProfitSettings, string>;
const blankRow = (id: number): Row => ({
  id,
  name: "",
  earnings: "",
  hours: "",
  miles: "0",
  otherCosts: "0",
});
const startingSettings = (): SettingsForm => ({
  costPerMile: String(DEFAULT_PROFIT_SETTINGS.costPerMile),
  taxReservePercent: String(DEFAULT_PROFIT_SETTINGS.taxReservePercent),
  targetHourly: String(DEFAULT_PROFIT_SETTINGS.targetHourly),
});
function numberFrom(value: string, maximum = 1_000_000_000) {
  if (!value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= maximum
    ? number
    : null;
}
function workFrom(row: Row): WorkTotals | null {
  const earnings = numberFrom(row.earnings);
  const hours = numberFrom(row.hours, 1_000_000);
  const miles = numberFrom(row.miles, 10_000_000);
  const otherCosts = numberFrom(row.otherCosts);
  return earnings !== null &&
    hours !== null &&
    hours > 0 &&
    miles !== null &&
    otherCosts !== null
    ? { earnings, hours, miles, otherCosts }
    : null;
}
const rowFields = [
  { key: "earnings", label: "Total earnings ($)", max: 1_000_000_000 },
  { key: "hours", label: "Total work hours", max: 1_000_000 },
  { key: "miles", label: "Business miles", max: 10_000_000 },
  { key: "otherCosts", label: "Other costs ($)", max: 1_000_000_000 },
] as const;
const assumptionFields = [
  {
    key: "costPerMile",
    label: "Actual vehicle cost per mile ($)",
    max: 1000,
    hint: "$0.35 is a starting assumption to edit, not an IRS deduction rate. Include fuel, maintenance, insurance and depreciation. Use zero for work without driving.",
  },
  {
    key: "taxReservePercent",
    label: "Tax reserve (%)",
    max: 99.99,
    hint: "Reserve this share of combined positive operating profit. Choose 0–99.99%. This is a planning cushion, not your calculated tax bill.",
  },
  {
    key: "targetHourly",
    label: "Hourly goal after costs and reserve ($)",
    max: 100_000,
    hint: "What you want to keep for each hour of work, including the time you cannot bill.",
  },
] as const;
const FAQS = [
  {
    q: "How is the hourly result calculated?",
    a: "Operating profit is your entered earnings minus business miles multiplied by your editable actual cost per mile, minus other costs. We reserve your chosen percentage of combined positive operating profit, then divide what remains by all recorded working hours, including waiting and unpaid work. No reserve is subtracted from a combined loss.",
  },
  {
    q: "Does the mileage deduction equal my actual costs?",
    a: "No. A tax deduction reduces taxable income. This planner uses your estimate of actual vehicle costs, including fuel, maintenance, insurance and depreciation. The $0.35 starting assumption is editable and is not an IRS mileage rate. Do not also enter those same vehicle costs under other costs.",
  },
  {
    q: "Can a result be negative?",
    a: "Yes. When entered business costs exceed earnings, the calculator shows the loss, including its effect on the combined hourly result. A loss is not rounded up to zero.",
  },
  {
    q: "Can I compare different platforms or clients?",
    a: "Yes. Use the same time period and consistent earnings definitions for every source. Include unpaid waiting and administrative work, and avoid counting the same hours twice when apps overlap. Deduct platform fees only if they are still included in the earnings you enter. Results describe your records and assumptions; they do not predict future pay.",
  },
  {
    q: "Which miles should I enter?",
    a: "Enter business miles attributable to the work period you are comparing. Tax eligibility is a separate question: personal trips and commuting can have different rules. Check IRS Publication 463 for guidance on deductible mileage.",
  },
];
const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Work Profit and Hourly Rate Planner",
    url: CANONICAL,
    description:
      "Compare delivery, rideshare and freelance work after editable actual business costs and a user-chosen tax reserve.",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: {
      "@type": "Organization",
      name: "1Commerce / UnifyOne",
      url: SITE_URL,
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: "Free tools",
        item: `${SITE_URL}/tools`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Work Profit and Hourly Rate Planner",
        item: CANONICAL,
      },
    ],
  },
];

export default function GigHourlyRate() {
  const [rows, setRows] = useState<Row[]>([blankRow(1)]);
  const [nextId, setNextId] = useState(2);
  const [form, setForm] = useState(startingSettings);
  const [example, setExample] = useState(false);
  const [notice, setNotice] = useState("");
  const settings = useMemo(() => {
    const parsed = {
      costPerMile: numberFrom(form.costPerMile, 1000),
      taxReservePercent: numberFrom(form.taxReservePercent, 99.99),
      targetHourly: numberFrom(form.targetHourly, 100_000),
    };
    return Object.values(parsed).every(value => value !== null)
      ? (parsed as ProfitSettings)
      : null;
  }, [form]);
  const calculationState = useMemo(() => {
    if (!settings) return { data: null, error: null };
    const parsed = rows.map(row => ({ row, work: workFrom(row) }));
    if (parsed.some(entry => !entry.work)) return { data: null, error: null };
    try {
      const sources = parsed.map(({ row, work }, index) => ({
        id: row.id,
        name: row.name.trim() || `Income source ${index + 1}`,
        work: work!,
        result: calculateWorkProfit(work!, settings),
      }));
      const totals = sources.reduce<WorkTotals>(
        (sum, source) => ({
          earnings: sum.earnings + source.work.earnings,
          hours: sum.hours + source.work.hours,
          miles: sum.miles + source.work.miles,
          otherCosts: sum.otherCosts + source.work.otherCosts,
        }),
        { earnings: 0, hours: 0, miles: 0, otherCosts: 0 }
      );
      return {
        data: {
          sources: sources.sort(
            (a, b) =>
              b.result.operatingProfit / b.work.hours -
              a.result.operatingProfit / a.work.hours
          ),
          totals,
          result: calculateWorkProfit(totals, settings),
        },
        error: null,
      };
    } catch {
      return {
        data: null,
        error:
          "These figures are too large to calculate reliably. Reduce them to a shorter work period.",
      };
    }
  }, [rows, settings]);
  const calculation = calculationState.data;
  const pristine =
    rows.length === 1 &&
    rows[0].name === "" &&
    rows[0].earnings === "" &&
    rows[0].hours === "";
  function updateRow(id: number, field: keyof Row, value: string) {
    setRows(previous =>
      previous.map(row => (row.id === id ? { ...row, [field]: value } : row))
    );
    setNotice("");
  }
  function clear() {
    setRows([blankRow(1)]);
    setNextId(2);
    setForm(startingSettings());
    setExample(false);
    setNotice("Cleared. Enter your own shift or project to begin.");
  }
  function loadExample() {
    setRows([
      {
        id: 1,
        name: "Example delivery work",
        earnings: "240",
        hours: "10",
        miles: "120",
        otherCosts: "8",
      },
      {
        id: 2,
        name: "Example rideshare work",
        earnings: "310",
        hours: "10",
        miles: "210",
        otherCosts: "12",
      },
      {
        id: 3,
        name: "Example freelance project",
        earnings: "300",
        hours: "12",
        miles: "0",
        otherCosts: "20",
      },
    ]);
    setNextId(4);
    setForm(startingSettings());
    setExample(true);
    setNotice(
      "Illustrative figures loaded. These are not your earnings or market averages."
    );
  }
  function download() {
    if (!calculation || !settings) return;
    // User-provided labels cannot become spreadsheet formulas.
    const cell = (value: string) =>
      `"${(/^\s*[=+\-@]/.test(value) ? "'" + value : value).replaceAll('"', '""')}"`;
    const { sources, totals, result } = calculation;
    const text = [
      "Source,Earnings USD,Work hours,Business miles,Other costs USD,Estimated vehicle costs USD,Operating profit USD,Profit per hour before reserve USD",
      ...sources.map(source =>
        [
          cell(source.name),
          source.work.earnings,
          source.work.hours,
          source.work.miles,
          source.work.otherCosts,
          source.result.vehicleCost.toFixed(2),
          source.result.operatingProfit.toFixed(2),
          (source.result.operatingProfit / source.work.hours).toFixed(2),
        ].join(",")
      ),
      "",
      "Assumption,Value",
      `Data type,${example ? "Illustrative example - replace with your own figures" : "User-entered planning figures"}`,
      `Vehicle cost per mile USD,${settings.costPerMile}`,
      `Tax reserve percent,${settings.taxReservePercent}`,
      `Hourly goal after reserve USD,${settings.targetHourly}`,
      "",
      "Combined totals,USD",
      `Earnings,${totals.earnings.toFixed(2)}`,
      `Operating profit,${result.operatingProfit.toFixed(2)}`,
      `Estimated tax reserve,${result.taxReserve.toFixed(2)}`,
      `Left after costs and reserve,${result.takeHome.toFixed(2)}`,
      `Hourly after costs and reserve,${result.hourly!.toFixed(2)}`,
      `Required earnings at the same hours and costs,${roundUpCents(result.requiredEarnings!).toFixed(2)}`,
    ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/csv;charset=utf-8" })
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = example
      ? "unifyone-example-work-profit.csv"
      : "unifyone-work-profit.csv";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("CSV downloaded with the figures and assumptions shown here.");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHead
        title="Work Profit & Real Hourly Rate Calculator | UnifyOne"
        description="Compare delivery, rideshare and freelance work after actual costs and a tax reserve you choose. See the earnings needed to reach your hourly goal."
        canonical={CANONICAL}
        jsonLd={jsonLd}
      />
      <nav className="border-b bg-background" aria-label="Tool navigation">
        <div className="mx-auto flex min-h-14 max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/tools"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Free tools
          </Link>
          <Link
            href="/gig-command"
            className="text-sm font-medium text-primary"
          >
            Track my work{" "}
            <ArrowRight className="ml-1 inline h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-8 max-w-3xl">
          <Badge
            variant="outline"
            className="mb-4 border-primary/30 text-primary"
          >
            Free · No account needed
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
            What did you really earn?
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Delivery, rideshare, freelance—or all three. Find what stays yours
            after business costs and a tax reserve. Then decide which work
            deserves your next hour.
          </p>
        </header>
        <div className="mb-6 flex flex-wrap items-center gap-3">
          {pristine && (
            <Button variant="outline" onClick={loadExample}>
              Try an example
            </Button>
          )}
          {example && (
            <Button variant="outline" onClick={clear}>
              Start with my own figures
            </Button>
          )}
          <p className="text-sm text-muted-foreground">
            No bank connection needed. Nothing is saved in your browser.
          </p>
        </div>
        {example && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
            <strong>Illustrative example.</strong> These figures are for
            learning, not actual earnings or market averages. Choose “Start with
            my own figures” to enter your work.
          </div>
        )}
        <div className="grid items-start gap-6 lg:grid-cols-[1.25fr_1fr]">
          <section
            className="min-w-0 space-y-5 rounded-2xl border bg-card p-5 sm:p-6"
            aria-labelledby="work-heading"
          >
            <div>
              <h2 id="work-heading" className="text-xl font-semibold">
                1. Account for all your working time
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Use the same period for every source. Include tips and bonuses
                once. Count waiting, driving between jobs, admin and unpaid
                client work. Split shared hours and miles between sources so
                they are counted once.
              </p>
            </div>
            {rows.map((row, index) => (
              <fieldset
                key={row.id}
                className="min-w-0 rounded-xl border bg-background/30 p-4"
              >
                <legend className="px-1 text-sm font-semibold">
                  Income source {index + 1}
                </legend>
                <div className="mb-4 flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <Label htmlFor={`source-${row.id}`}>
                      App, client or project
                    </Label>
                    <Input
                      className="mt-1"
                      id={`source-${row.id}`}
                      value={row.name}
                      maxLength={80}
                      placeholder="e.g. DoorDash, Uber, design client"
                      onChange={event =>
                        updateRow(row.id, "name", event.target.value)
                      }
                    />
                  </div>
                  {rows.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="min-h-11 min-w-11 shrink-0"
                      aria-label={`Remove income source ${index + 1}`}
                      onClick={() => {
                        setRows(previous =>
                          previous.filter(item => item.id !== row.id)
                        );
                        setNotice("");
                      }}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {rowFields.map(({ key, label, max }) => {
                    const invalid =
                      row[key] !== "" &&
                      (numberFrom(row[key], max) === null ||
                        (key === "hours" && Number(row[key]) === 0));
                    return (
                      <div key={key} className="min-w-0">
                        <Label htmlFor={`${row.id}-${key}`}>{label}</Label>
                        <Input
                          className="mt-1"
                          id={`${row.id}-${key}`}
                          type="number"
                          min="0"
                          max={max}
                          step="any"
                          inputMode="decimal"
                          value={row[key]}
                          aria-invalid={invalid}
                          aria-describedby={
                            invalid ? `${row.id}-${key}-error` : undefined
                          }
                          onChange={event =>
                            updateRow(row.id, key, event.target.value)
                          }
                        />
                        {invalid && (
                          <p
                            id={`${row.id}-${key}-error`}
                            className="mt-1 text-xs text-red-300"
                          >
                            {key === "hours"
                              ? "Enter work hours above zero."
                              : "Enter zero or a positive value within the input limit."}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  Other costs: tolls, parking, supplies, software, or fees not
                  already deducted from earnings. Do not include the vehicle
                  costs a second time.
                </p>
              </fieldset>
            ))}
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              disabled={rows.length >= 10}
              onClick={() => {
                setRows(previous => [...previous, blankRow(nextId)]);
                setNextId(value => value + 1);
                setNotice("");
              }}
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Add an income source
            </Button>
            <fieldset className="space-y-4 border-t pt-5">
              <legend className="pt-5 text-xl font-semibold">
                2. Choose your assumptions
              </legend>
              {assumptionFields.map(({ key, label, max, hint }) => {
                const invalid = numberFrom(form[key], max) === null;
                return (
                  <div key={key}>
                    <Label htmlFor={key}>{label}</Label>
                    <Input
                      className="mt-1 max-w-48"
                      id={key}
                      type="number"
                      min="0"
                      max={max}
                      step="any"
                      inputMode="decimal"
                      value={form[key]}
                      aria-describedby={`${key}-hint`}
                      aria-invalid={invalid}
                      onChange={event => {
                        setForm(previous => ({
                          ...previous,
                          [key]: event.target.value,
                        }));
                        setNotice("");
                      }}
                    />
                    <p
                      id={`${key}-hint`}
                      className={`mt-1 text-xs leading-relaxed ${invalid ? "text-red-300" : "text-muted-foreground"}`}
                    >
                      {hint}
                    </p>
                  </div>
                );
              })}
            </fieldset>
          </section>
          <aside
            className="min-w-0 space-y-4 lg:sticky lg:top-6"
            aria-label="Your profit plan"
          >
            <section
              className="rounded-2xl border border-primary/30 bg-card p-5 sm:p-6"
              aria-labelledby="results-heading"
            >
              <div className="flex items-center gap-2 text-primary">
                <Calculator className="h-4 w-4" aria-hidden="true" />
                <h2
                  id="results-heading"
                  className="text-sm font-semibold uppercase tracking-wider"
                >
                  {example ? "Example result" : "Your profit plan"}
                </h2>
              </div>
              {calculation && settings ? (
                <>
                  <p
                    data-testid="take-home"
                    className={`mt-4 break-words text-4xl font-bold tabular-nums ${calculation.result.takeHome < 0 ? "text-red-300" : "text-foreground"}`}
                  >
                    {usd(calculation.result.takeHome)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    left after costs and your chosen reserve
                  </p>
                  <dl className="my-6 space-y-3 text-sm">
                    {[
                      ["Total earnings", calculation.totals.earnings],
                      [
                        "Estimated vehicle costs",
                        -calculation.result.vehicleCost,
                      ],
                      ["Other business costs", -calculation.totals.otherCosts],
                      ["Operating profit", calculation.result.operatingProfit],
                      ["Tax reserve", -calculation.result.taxReserve],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="flex flex-wrap justify-between gap-2"
                      >
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="font-medium tabular-nums">
                          {usd(Number(value))}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <div className="border-t pt-5">
                    <p
                      data-testid="hourly-result"
                      className="break-words text-3xl font-bold tabular-nums"
                    >
                      {usd(calculation.result.hourly!)}
                      <span className="text-base font-normal text-muted-foreground">
                        {" "}
                        / hour
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Across{" "}
                      {calculation.totals.hours.toLocaleString("en-US", {
                        maximumFractionDigits: 2,
                      })}{" "}
                      total work hours, after costs and reserve
                    </p>
                  </div>
                  <div className="mt-5 rounded-xl bg-muted/40 p-4">
                    <h3 className="font-semibold">
                      {calculation.result.earningsGap! > 0.005
                        ? `${usd(roundUpCents(calculation.result.earningsGap!))} short of your goal`
                        : "This work meets your hourly goal"}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {calculation.result.earningsGap! > 0.005
                        ? `At the same hours and costs, you need ${usd(roundUpCents(calculation.result.requiredEarnings!))} in total earnings to keep ${usd(settings.targetHourly)} per hour after reserve.`
                        : `Your goal is ${usd(settings.targetHourly)} per hour after costs and reserve.`}
                    </p>
                  </div>
                </>
              ) : (
                <div className="py-8">
                  <h3 className="text-xl font-semibold">
                    Start with one shift or project
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    Enter earnings and work hours for every source. Zero
                    earnings are allowed; hours must be above zero. Complete all
                    sources to see a combined result.
                  </p>
                  {calculationState.error && (
                    <p role="alert" className="mt-3 text-sm text-red-300">
                      {calculationState.error}
                    </p>
                  )}
                  {!settings && (
                    <p role="alert" className="mt-3 text-sm text-red-300">
                      Check your assumptions. Use nonnegative values and a
                      reserve below 100%.
                    </p>
                  )}
                </div>
              )}
            </section>
            <div className="flex flex-wrap gap-2">
              <Button
                className="min-h-11"
                variant="outline"
                disabled={!calculation}
                onClick={download}
              >
                <ArrowDownToLine className="mr-2 h-4 w-4" aria-hidden="true" />
                Download CSV
              </Button>
              <Button className="min-h-11" variant="ghost" onClick={clear}>
                <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                Clear figures
              </Button>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Figures stay on this page until you clear, reload or leave it.
              Download a CSV if you want a copy; it contains your financial
              figures and assumptions.
            </p>
            <p role="status" className="text-sm text-muted-foreground">
              {notice}
            </p>
          </aside>
        </div>
        {calculation && (
          <section
            className="mt-8 rounded-2xl border bg-card p-5 sm:p-6"
            aria-labelledby="comparison-heading"
          >
            <h2 id="comparison-heading" className="text-xl font-semibold">
              Which work paid best?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Ranked by operating profit per hour before the combined tax
              reserve. These are the results you entered, not predicted
              earnings. A profitable source can offset a loss in the combined
              reserve calculation.
            </p>
            <ul
              className="mt-5 space-y-3"
              aria-label="Income source comparison"
            >
              {calculation.sources.map((source, index) => (
                <li key={source.id} className="min-w-0 rounded-xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words font-semibold">
                        {source.name}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {source.work.hours} hours · {source.work.miles} miles ·{" "}
                        {usd(source.result.operatingProfit)} operating profit
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={`font-semibold tabular-nums ${source.result.operatingProfit < 0 ? "text-red-300" : "text-foreground"}`}
                      >
                        {usd(source.result.operatingProfit / source.work.hours)}{" "}
                        / hr
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        before reserve
                      </p>
                    </div>
                  </div>
                  {index === 0 && calculation.sources.length > 1 && (
                    <Badge variant="outline" className="mt-3">
                      Highest entered hourly profit
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="mt-8 grid gap-6 rounded-2xl border bg-muted/20 p-5 sm:grid-cols-2 sm:p-6">
          <div>
            <h2 className="font-semibold">
              A deduction is not cash in your pocket
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The planner subtracts your estimated actual costs. An IRS mileage
              deduction reduces taxable income; it is not a reimbursement or a
              measure of what your vehicle actually cost. We do not subtract
              both.
            </p>
          </div>
          <div>
            <h2 className="font-semibold">
              A reserve is a plan, not your tax bill
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Your real tax depends on income, deductions, filing status and
              location. This planner uses the percentage you choose and reserves
              nothing against a combined loss. Bank deposits are not added as a
              second source of the same earnings.
            </p>
            <Link
              href="/tools/quarterly-tax-estimator"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary"
            >
              Explore tax planning{" "}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
        <section
          className="mt-8 rounded-2xl border p-5 sm:p-6"
          aria-labelledby="profit-faq-heading"
        >
          <h2 id="profit-faq-heading" className="text-xl font-semibold">
            Frequently asked questions
          </h2>
          <div className="mt-5 space-y-6">
            {FAQS.map(({ q, a }) => (
              <div key={q}>
                <h3 className="font-semibold">{q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {a}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
