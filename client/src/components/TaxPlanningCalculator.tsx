import { useState } from "react";
import { Link } from "wouter";
import ReadingLayout from "./ReadingLayout";
import PageHead from "./PageHead";
import { SITE_URL } from "@/lib/siteConfig";
import { TAX_TOOLS, TAX_TOOL_FAQS, TAX_TOOL_SOURCES } from "@/content/taxTools";
import {
  taxPlan2026,
  ESTIMATED_DUE_DATES,
  type FilingStatus2026,
} from "@shared/publicTax2026";

type Tool = keyof typeof TAX_TOOLS;
const fieldDefinitions = [
  [
    "profit",
    "Annual net business profit ($)",
    "After all eligible business deductions, including mileage. One self-employed person only; do not combine spouses' business profits.",
  ],
  [
    "otherIncome",
    "Other household ordinary income ($)",
    "Include both spouses' taxable W-2 wages when filing jointly. Exclude this business profit. No capital gains or qualified dividends.",
  ],
  [
    "ownSocialSecurityWages",
    "Your Social Security wages ($)",
    "This business owner's annual W-2 box 3 total; never include a spouse's wages. Reduces your remaining $184,500 Social Security base.",
  ],
  [
    "householdMedicareWages",
    "Household Medicare wages ($)",
    "Annual W-2 box 5 total, including a spouse when joint. Used only for Additional Medicare Tax; enter taxable wages in other income too.",
  ],
  [
    "incomeAdjustments",
    "Other eligible adjustments to income ($)",
    "Allowed Schedule 1 adjustments other than the SE tax deduction calculated here. Verify limits; do not repeat business expenses.",
  ],
  [
    "additionalDeductions",
    "Allowed deductions beyond basic standard deduction ($)",
    "Manually computed QBI, qualified tips, other Schedule 1-A amounts or eligible additions. No automatic eligibility calculation; do not enter the standard deduction again.",
  ],
  [
    "nonrefundableCredits",
    "Allowed nonrefundable income-tax credits ($)",
    "Enter verified credits. Limited here to modeled income tax; cannot offset regular SE tax.",
  ],
  [
    "refundableCredits",
    "Allowed refundable credits ($)",
    "Enter verified amounts. Eligibility and phaseouts are not calculated.",
  ],
  [
    "withholding",
    "Expected full-year federal withholding ($)",
    "Include income-tax and Additional Medicare withholding. Exclude regular Social Security/Medicare payroll withholding and estimated payments.",
  ],
  [
    "paymentsMade",
    "Federal estimated payments already made ($)",
    "Include an applied prior-year overpayment. Reduces remaining annual balances, not the original equal-installment schedule.",
  ],
  [
    "stateLocalReserve",
    "Remaining state/local reserve ($)",
    "Your separately calculated amount. No state rate is applied to federal profit; local income and gross-receipts taxes use different rules.",
  ],
] as const;
type Field = (typeof fieldDefinitions)[number][0];
const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const initial = Object.fromEntries(
  fieldDefinitions.map(([key]) => [key, key === "profit" ? "" : "0"])
) as Record<Field, string>;
export default function TaxPlanningCalculator({ tool }: { tool: Tool }) {
  const meta = TAX_TOOLS[tool];
  const seOnly = tool === "se-tax-calculator";
  const [values, setValues] = useState(initial);
  const [status, setStatus] = useState<FilingStatus2026>("single");
  const [usePrior, setUsePrior] = useState(false);
  const [priorTax, setPriorTax] = useState("");
  const [priorAgi, setPriorAgi] = useState("");
  const [show, setShow] = useState(false);
  const fields = fieldDefinitions.filter(
    ([key]) =>
      !seOnly ||
      ["profit", "ownSocialSecurityWages", "householdMedicareWages"].includes(
        key
      )
  );
  const validNumber = (s: string) =>
    s.trim() !== "" &&
    Number.isFinite(Number(s)) &&
    Number(s) >= 0 &&
    Number(s) <= 1e9;
  const valid =
    fields.every(([key]) => validNumber(values[key])) &&
    (!usePrior || (validNumber(priorTax) && validNumber(priorAgi)));
  const numbers = Object.fromEntries(
    fieldDefinitions.map(([key]) => [key, Number(values[key])])
  ) as Record<Field, number>;
  const result = valid
    ? taxPlan2026({
        ...numbers,
        status,
        priorYear: usePrior
          ? { tax: Number(priorTax), agi: Number(priorAgi) }
          : undefined,
      })
    : null;
  const canonical = `${SITE_URL}/tools/${tool}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: meta.title,
      description: meta.description,
      url: canonical,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Any",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: TAX_TOOL_FAQS.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
  ];
  return (
    <ReadingLayout kind="calculator">
      <PageHead
        title={`${meta.title} | UnifyOne`}
        description={meta.description}
        canonical={canonical}
        jsonLd={jsonLd}
      />
      <div className="reading-content">
        <header className="mb-8">
          <p className="text-primary text-sm">
            Free tool · Reviewed November 7, 2026
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold my-4">{meta.title}</h1>
          <p>{meta.description}</p>
        </header>
        <aside
          className="rounded-xl border p-5 mb-6 text-sm space-y-2"
          aria-label="Calculation scope"
        >
          <strong>2026 planning basis</strong>
          <p>
            Single or joint filers, one self-employed person, ordinary income
            and basic standard deduction. Estimates depend on complete inputs.
            This does not calculate a tax return or send a payment.
          </p>
          <p>
            {seOnly
              ? "Shows regular SE tax and Additional Medicare Tax separately. Income tax is not included."
              : "QBI, qualified-tip deductions and credits are not automatic. Enter allowed amounts below; zero may overstate tax. Wages left at zero mean no wages are assumed."}
          </p>
          <p>
            For losses, dependents, itemizing, two self-employed spouses or
            other filing statuses, use IRS worksheets or a qualified preparer.
          </p>
        </aside>
        <form
          className="rounded-xl border bg-card p-5 sm:p-8 space-y-6"
          onSubmit={e => {
            e.preventDefault();
            setShow(valid);
          }}
          onChange={() => setShow(false)}
        >
          <div>
            <label htmlFor="tax-status" className="block font-medium mb-2">
              2026 filing status
            </label>
            <select
              id="tax-status"
              value={status}
              onChange={e => setStatus(e.target.value as FilingStatus2026)}
              className="w-full border rounded-md p-3 bg-background"
            >
              <option value="single">Single</option>
              <option value="mfj">Married filing jointly</option>
            </select>
          </div>
          {fields.map(([key, label, hint]) => (
            <div key={key}>
              <label htmlFor={key} className="block font-medium mb-2">
                {label}
              </label>
              <input
                id={key}
                aria-describedby={`${key}-hint`}
                required
                type="number"
                inputMode="decimal"
                min="0"
                max="1000000000"
                step="any"
                value={values[key]}
                onChange={e => setValues({ ...values, [key]: e.target.value })}
                className="w-full border rounded-md p-3 bg-background"
              />
              <p
                id={`${key}-hint`}
                className="text-sm text-muted-foreground mt-2"
              >
                {hint}
              </p>
            </div>
          ))}
          {!seOnly && (
            <fieldset className="border rounded-lg p-4 space-y-4">
              <legend>Optional prior-year comparison</legend>
              <label className="flex gap-3">
                <input
                  type="checkbox"
                  checked={usePrior}
                  onChange={e => setUsePrior(e.target.checked)}
                />
                I have an eligible 12-month 2025 return and the amounts required
                by Form 1040-ES.
              </label>
              {usePrior && (
                <>
                  <label className="block">
                    2025 tax for safe-harbor purposes ($)
                    <input
                      aria-label="2025 tax for safe-harbor purposes"
                      type="number"
                      required
                      min="0"
                      max="1000000000"
                      step="any"
                      value={priorTax}
                      onChange={e => setPriorTax(e.target.value)}
                      className="block w-full border rounded p-3 bg-background"
                    />
                  </label>
                  <label className="block">
                    2025 adjusted gross income ($)
                    <input
                      aria-label="2025 adjusted gross income"
                      type="number"
                      required
                      min="0"
                      max="1000000000"
                      step="any"
                      value={priorAgi}
                      onChange={e => setPriorAgi(e.target.value)}
                      className="block w-full border rounded p-3 bg-background"
                    />
                  </label>
                  <p className="text-sm">
                    Use the 1040-ES prior-year worksheet, not a refund or
                    balance due. This tool does not determine eligibility or
                    handle negative prior-year AGI.
                  </p>
                </>
              )}
            </fieldset>
          )}
          <button
            disabled={!valid}
            className="rounded-md bg-primary text-primary-foreground p-3 w-full disabled:opacity-40"
          >
            Calculate 2026 estimate
          </button>
        </form>
        {show && result && (
          <section
            className="my-8 rounded-xl border p-5 space-y-4"
            role="status"
            aria-live="polite"
          >
            <h2 className="text-xl font-semibold">Estimated results</h2>
            <dl className="space-y-3">
              {(
                [
                  ["Net SE earnings (92.35% of profit)", result.netEarnings],
                  ["Social Security portion", result.socialSecurity],
                  ["Regular Medicare portion", result.medicare],
                  ["Regular self-employment tax", result.regularSE],
                  ["Deductible half of regular SE tax", result.deductibleHalf],
                  [
                    "Additional Medicare Tax on household wages",
                    result.additionalMedicareOnWages,
                  ],
                  [
                    "Additional Medicare Tax on SE earnings",
                    result.additionalMedicareOnSE,
                  ],
                  ...(!seOnly
                    ? [
                        ["Taxable ordinary income", result.taxableIncome],
                        ["Income tax before credits", result.incomeTax],
                        [
                          "Modeled federal tax after credits",
                          result.federalTax,
                        ],
                        [
                          "Federal balance after withholding and estimates paid",
                          result.remainingFederal,
                        ],
                        [
                          "Remaining reserve including entered state/local amount",
                          result.reserve,
                        ],
                      ]
                    : []),
                ] as [string, number][]
              ).map(([label, n]) => (
                <div
                  key={label}
                  className="flex justify-between gap-4 border-b pb-2"
                >
                  <dt>{label}</dt>
                  <dd className="font-semibold shrink-0">{money(n)}</dd>
                </div>
              ))}
            </dl>
            {!seOnly && (
              <>
                <p>
                  <strong>
                    Reserve as a share of annual net profit:{" "}
                    {result.reservePercent === null
                      ? "Not applicable at zero profit"
                      : `${result.reservePercent.toFixed(2)}%`}
                  </strong>
                </p>
                <p className="text-sm">
                  This is a household remaining-balance planning ratio, not a
                  gross-payout percentage or an incremental gig tax rate. It can
                  exceed 100% when other income is underwithheld. It is not
                  adjusted for the part of the year remaining.
                </p>
                <h3 className="font-semibold">
                  Federal estimated-payment comparison
                </h3>
                <p>
                  Annual estimated-payment target after withholding:{" "}
                  <strong>{money(result.estimatedPayments)}</strong>. Remaining
                  toward that target after entered payments:{" "}
                  <strong>{money(result.remainingTarget)}</strong>.
                </p>
                <p className="text-sm">
                  Uses the general $1,000 balance test and 90% of modeled
                  current tax
                  {usePrior
                    ? ", compared with eligible prior-year tax at 100% or 110%"
                    : "; no prior-year comparison entered"}
                  . Meeting this target can still leave tax due at filing.
                </p>
                <ul className="space-y-2">
                  {ESTIMATED_DUE_DATES.map(date => (
                    <li key={date}>
                      {date}: {money(result.equalInstallment)} baseline
                      installment
                    </li>
                  ))}
                </ul>
                <p className="text-sm">
                  The schedule assumes equal installments starting April 15 and
                  withholding spread evenly. It does not allocate payments to
                  dates, calculate penalties or tell you what to pay today.
                  Uneven earnings may qualify for annualization; disaster relief
                  or other exceptions may change deadlines. Do not divide a
                  late-year shortfall by four and assume earlier obligations
                  disappear.
                </p>
              </>
            )}
            <p className="text-sm">
              Additional Medicare Tax is not included in the deductible half of
              SE tax. Regular Social Security and Medicare payroll tax on wages
              is not part of these results.
            </p>
          </section>
        )}
        <section className="my-10 space-y-5">
          <h2 className="text-xl font-semibold">
            Assumptions and common questions
          </h2>
          {TAX_TOOL_FAQS.map(({ q, a }) => (
            <div key={q}>
              <h3 className="font-semibold">{q}</h3>
              <p className="text-muted-foreground">{a}</p>
            </div>
          ))}
        </section>
        <section className="my-8">
          <h2 className="text-xl font-semibold mb-3">Official sources</h2>
          <ul className="space-y-3">
            {TAX_TOOL_SOURCES.map(s => (
              <li key={s.url}>
                <a href={s.url} className="text-primary underline">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
        <p className="my-8">
          <Link href="/tools" className="text-primary underline">
            All free tools
          </Link>{" "}
          ·{" "}
          <Link href="/gig-taxes" className="text-primary underline">
            Tax guidance
          </Link>
        </p>
      </div>
    </ReadingLayout>
  );
}
