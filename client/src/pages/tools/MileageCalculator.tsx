import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowDownToLine, ArrowRight, Car, Info } from "lucide-react";
import PageHead from "@/components/PageHead";
import PublicLayout from "@/components/PublicLayout";
import "@/components/reading.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SITE_URL } from "@/lib/siteConfig";
import { trackToolUsage } from "@/lib/userTracking";
import {
  BUSINESS_MILEAGE_RATE_PERIODS,
  BUSINESS_MILEAGE_SOURCE_URL,
  calculateBusinessMileageDeductionCents,
  getBusinessMileagePeriods,
} from "@shared/mileageRates";

const CANONICAL = `${SITE_URL}/tools/mileage-deduction-calculator`;
const YEARS = Array.from(
  new Set(
    BUSINESS_MILEAGE_RATE_PERIODS.map(period =>
      Number(period.startDate.slice(0, 4))
    )
  )
).sort((a, b) => b - a);
const usd = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
const validMiles = (value: string) =>
  value.trim() !== "" &&
  Number.isFinite(Number(value)) &&
  Number(value) >= 0 &&
  Number(value) <= 10_000_000 &&
  Number(value) === Number(Number(value).toFixed(2));

const FAQS = [
  {
    question: "Which mileage rate should I use?",
    answer:
      "Use the business rate for the date you drove. Choose a supported year and separate miles for every rate period shown. Enter 0 for a period with no eligible miles.",
  },
  {
    question: "Does a deduction mean I receive that amount in cash?",
    answer:
      "No. An eligible mileage deduction reduces taxable income. It is separate from a reimbursement, tax refund, or the actual cost of running your vehicle.",
  },
  {
    question: "Does this change my saved mileage records?",
    answer:
      "No. This public calculator estimates the miles you enter here. Saved mileage records keep their original rates and amounts, and you should keep supporting records and review eligibility before filing.",
  },
];
const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Business Mileage Deduction Calculator",
    url: CANONICAL,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Any",
    description:
      "Estimate eligible business mileage deductions using verified IRS rate periods, including both 2026 periods. A deduction is not a cash payment.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: {
      "@type": "Organization",
      name: "1Commerce / UnifyOne",
      url: SITE_URL,
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${SITE_URL}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Free Tools",
        item: `${SITE_URL}/tools`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Mileage Deduction Calculator",
        item: CANONICAL,
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map(faq => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  },
];

export default function MileageCalculator() {
  const [year, setYear] = useState(() =>
    YEARS.includes(new Date().getFullYear())
      ? String(new Date().getFullYear())
      : ""
  );
  const [milesByPeriod, setMilesByPeriod] = useState<Record<string, string>>(
    {}
  );
  const [showResult, setShowResult] = useState(false);
  const periods = useMemo(
    () => (year ? getBusinessMileagePeriods(Number(year)) : []),
    [year]
  );
  const valid =
    periods.length > 0 &&
    periods.every(period => validMiles(milesByPeriod[period.startDate] ?? ""));
  const results = valid
    ? periods.map(period => ({
        ...period,
        miles: Number(milesByPeriod[period.startDate]),
        deductionCents: calculateBusinessMileageDeductionCents(
          Number(milesByPeriod[period.startDate]),
          period.startDate
        ),
      }))
    : [];
  const totalMiles = results.reduce((sum, row) => sum + row.miles, 0);
  const totalCents = results.reduce((sum, row) => sum + row.deductionCents, 0);

  function download() {
    if (!valid) return;
    const csv = [
      "Tax year,Period start,Period end,Business miles,Rate cents per mile,Estimated deduction USD",
      ...results.map(row =>
        [
          year,
          row.startDate,
          row.endDate,
          row.miles,
          row.rateCents,
          (row.deductionCents / 100).toFixed(2),
        ].join(",")
      ),
      `Total,,,${totalMiles},,${(totalCents / 100).toFixed(2)}`,
      "",
      "Estimate only. Eligibility and contemporaneous mileage records must be reviewed before filing.",
    ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `unifyone-mileage-${year}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <PublicLayout>
      <div className="reading-page reading-calculator bg-background text-foreground font-sans">
        <PageHead
          title="Business Mileage Deduction Calculator | UnifyOne"
          description="Estimate business mileage deductions with date-specific IRS rates. Split 2026 miles between its two rate periods and keep deductions separate from cash savings."
          canonical={CANONICAL}
          jsonLd={jsonLd}
        />
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <Link
            href="/tools"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← All free tools
          </Link>
          <header className="my-8 max-w-2xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
              Keep the miles. Know the deduction.
            </p>
            <h1
              style={{ fontFamily: '"Inter", Arial, Helvetica, sans-serif' }}
              className="text-3xl font-bold tracking-tight sm:text-4xl"
            >
              What can your business miles deduct?
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              For delivery routes, rideshare trips and travel for client work.
              Use eligible business miles from your records and the rate for
              when you drove them.
            </p>
          </header>
          <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
            <form
              className="space-y-6 rounded-2xl border bg-card p-5 sm:p-6"
              onSubmit={event => {
                event.preventDefault();
                if (valid) {
                  setShowResult(true);
                  trackToolUsage("mileage-deduction-calculator", "result");
                }
              }}
            >
              <div>
                <Label htmlFor="mileage-year">Tax year</Label>
                <select
                  id="mileage-year"
                  className="mt-2 min-h-11 w-full rounded-md border bg-background px-3 text-sm"
                  value={year}
                  onChange={event => {
                    setYear(event.target.value);
                    setMilesByPeriod({});
                    setShowResult(false);
                  }}
                >
                  <option value="">Choose a supported year</option>
                  {YEARS.map(value => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-muted-foreground">
                  Only verified rate periods are offered. An unsupported year
                  does not inherit an older rate.
                </p>
              </div>
              {periods.length > 1 && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
                  <p className="font-semibold">
                    2026 has two business mileage rates
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Separate miles driven January–June from July–December. Enter
                    0 for a period with no eligible miles. Do not enter your
                    full-year mileage twice.
                  </p>
                </div>
              )}
              {periods.map(period => (
                <div key={period.startDate}>
                  <Label htmlFor={`miles-${period.startDate}`}>
                    {period.label} business miles
                  </Label>
                  <Input
                    id={`miles-${period.startDate}`}
                    className="mt-2 min-h-11"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="10000000"
                    step="0.01"
                    required
                    value={milesByPeriod[period.startDate] ?? ""}
                    aria-describedby={`rate-${period.startDate}`}
                    aria-invalid={
                      !!milesByPeriod[period.startDate] &&
                      !validMiles(milesByPeriod[period.startDate])
                    }
                    onChange={event => {
                      setMilesByPeriod(previous => ({
                        ...previous,
                        [period.startDate]: event.target.value,
                      }));
                      setShowResult(false);
                    }}
                  />
                  <p
                    id={`rate-${period.startDate}`}
                    className="mt-2 text-sm text-muted-foreground"
                  >
                    {period.rateCents}¢ per mile · {period.startDate} through{" "}
                    {period.endDate}
                  </p>
                </div>
              ))}
              <p className="text-xs leading-relaxed text-muted-foreground">
                Enter zero or more miles, with up to two decimal places. This
                calculator estimates business mileage only; it does not use
                business rates for medical, charity or personal trips.
              </p>
              <Button
                className="min-h-11 w-full"
                type="submit"
                disabled={!valid}
              >
                Calculate mileage deduction
              </Button>
            </form>
            <section
              className="rounded-2xl border bg-card p-6"
              aria-labelledby="deduction-heading"
              aria-live="polite"
            >
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-primary">
                <Car className="h-5 w-5" aria-hidden="true" />
                Mileage estimate
              </div>
              <h2
                style={{ fontFamily: '"Inter", Arial, Helvetica, sans-serif' }}
                id="deduction-heading"
                className="text-lg font-semibold"
              >
                {showResult && valid
                  ? `Your ${year} deduction estimate`
                  : "Use your records to estimate"}
              </h2>
              {showResult && valid ? (
                <>
                  <p className="mt-4 text-4xl font-bold tabular-nums">
                    {usd(totalCents)}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Estimated deduction from{" "}
                    {totalMiles.toLocaleString("en-US", {
                      maximumFractionDigits: 2,
                    })}{" "}
                    eligible business miles.
                  </p>
                  <dl className="mt-6 space-y-4">
                    {results.map(row => (
                      <div
                        key={row.startDate}
                        className="flex justify-between gap-4 border-b pb-3 text-sm"
                      >
                        <dt className="text-muted-foreground">
                          {row.miles.toLocaleString()} mi × {row.rateCents}¢
                          <span className="mt-1 block text-xs">
                            {row.label}
                          </span>
                        </dt>
                        <dd className="font-semibold tabular-nums">
                          {usd(row.deductionCents)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <Button
                    variant="outline"
                    className="mt-5 min-h-11 w-full"
                    onClick={download}
                  >
                    <ArrowDownToLine className="mr-2 h-4 w-4" />
                    Download estimate CSV
                  </Button>
                </>
              ) : (
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  Choose a tax year and fill in the business miles for each
                  period. Your result will show how each rate contributes to the
                  total.
                </p>
              )}
              <div className="mt-6 flex gap-2 rounded-xl bg-muted/40 p-4 text-sm">
                <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p>
                  A deduction reduces taxable income. It is not a reimbursement,
                  cash refund, or a measure of your actual vehicle costs.
                </p>
              </div>
            </section>
          </div>
          <section className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border p-5">
              <h2
                style={{ fontFamily: '"Inter", Arial, Helvetica, sans-serif' }}
                className="font-semibold"
              >
                Keep a mileage log
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Keep dates, destinations, business purpose and miles. Personal
                use and commuting generally do not qualify. Eligibility depends
                on your circumstances and the deduction method you use.
              </p>
              <Link
                href="/money-manager?tab=mileage"
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary"
              >
                Open mileage records <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="rounded-xl border p-5">
              <h2
                style={{ fontFamily: '"Inter", Arial, Helvetica, sans-serif' }}
                className="font-semibold"
              >
                Use the official rate, not a guess
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Rates here come from the IRS table. Historical mileage saved in
                UnifyOne retains its stored rate; this public estimate does not
                change your saved records or calculate your tax bill.
              </p>
              <a
                href={BUSINESS_MILEAGE_SOURCE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary"
              >
                Review IRS standard mileage rates ↗
              </a>
            </div>
          </section>
          <section
            className="mt-8 space-y-3"
            aria-labelledby="mileage-faq-heading"
          >
            <h2
              style={{ fontFamily: '"Inter", Arial, Helvetica, sans-serif' }}
              id="mileage-faq-heading"
              className="text-lg font-semibold"
            >
              Mileage questions
            </h2>
            {FAQS.map(faq => (
              <details key={faq.question} className="rounded-xl border p-4">
                <summary className="cursor-pointer font-medium">
                  {faq.question}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {faq.answer}
                </p>
              </details>
            ))}
          </section>
          <section className="mt-8 rounded-xl bg-muted/30 p-6">
            <h2
              style={{ fontFamily: '"Inter", Arial, Helvetica, sans-serif' }}
              className="text-lg font-semibold"
            >
              Want to know what the work actually paid?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Compare your earnings against your actual estimated vehicle and
              business costs. The mileage deduction and your operating costs are
              different numbers.
            </p>
            <Link
              href="/tools/gig-hourly-rate"
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary"
            >
              Check your real hourly rate <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
