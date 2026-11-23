import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import PageHead from "@/components/PageHead";
import { SITE_URL } from "@/lib/siteConfig";
import { weeklyCashflow } from "@shared/publicToolMath";
const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const FAQS = [
  {
    q: "Are platform payout days guaranteed?",
    a: "No. Use your account settings and bank history. Payout initiation differs from bank availability; weekends, holidays, holds and processing can cause delays.",
  },
  {
    q: "Is the monthly result a 30-day forecast?",
    a: "No. It is a repeating-week scenario multiplied by 52 and divided by 12. No expenses, taxes or opening bank balance are included. Count instant withdrawals only once.",
  },
];
const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Payout Timing & Cash-Flow Planner",
    url: `${SITE_URL}/tools/cashflow-tracker`,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
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
];
export default function CashflowTracker() {
  const [amounts, setAmounts] = useState(days.map(() => "0"));
  const [show, setShow] = useState(false);
  const valid = amounts.every(
    s =>
      s.trim() !== "" &&
      Number.isFinite(Number(s)) &&
      Number(s) >= 0 &&
      Number(s) <= 1e9
  );
  const result = valid ? weeklyCashflow(amounts.map(Number)) : null;
  return (
    <ToolLayout toolName="Cash-Flow Tracker" breadcrumb="Cash-Flow Tracker">
      <PageHead
        jsonLd={jsonLd}
        title="Payout Timing & Cash-Flow Planner | UnifyOne"
        description="Model a repeating week using your expected bank deposit amounts and arrival days. No platform schedule or instant-pay fee is assumed."
        canonical={`${SITE_URL}/tools/cashflow-tracker`}
      />
      <header className="mb-8">
        <p className="text-primary text-sm">
          Free tool · Reviewed November 7, 2026
        </p>
        <h1 className="text-3xl font-bold my-4">
          Payout Timing & Cash-Flow Planner
        </h1>
        <p>
          Enter expected deposits from all your platforms on the day you expect
          funds to be available. Use account payout settings and recent bank
          history, not a universal platform payday.
        </p>
      </header>
      <form
        className="rounded-xl border p-5 space-y-5"
        onSubmit={e => {
          e.preventDefault();
          setShow(valid);
        }}
        onChange={() => setShow(false)}
      >
        {days.map((day, i) => (
          <div key={day}>
            <label htmlFor={`day-${i}`} className="block font-medium mb-2">
              {day} deposits after payout fees ($)
            </label>
            <input
              id={`day-${i}`}
              required
              type="number"
              min="0"
              max="1000000000"
              step="any"
              value={amounts[i]}
              onChange={e =>
                setAmounts(
                  amounts.map((v, j) => (i === j ? e.target.value : v))
                )
              }
              className="w-full border rounded p-3 bg-background"
            />
          </div>
        ))}
        <button
          disabled={!valid}
          className="w-full bg-primary text-primary-foreground rounded p-3 disabled:opacity-40"
        >
          Show my cash-flow schedule
        </button>
      </form>
      {show && result && (
        <section role="status" className="my-8 border rounded-xl p-5 space-y-3">
          <h2 className="text-xl font-semibold">Repeating-week estimate</h2>
          <p>
            Weekly deposits: <strong>{money(result.weekly)}</strong>
          </p>
          <p>
            Average monthly deposits:{" "}
            <strong>{money(result.monthlyAverage)}</strong> (52 weeks ÷ 12
            months)
          </p>
          <p>Days with deposits: {result.payoutDays}</p>
          <p>
            Longest consecutive gap, including the week boundary:{" "}
            {result.longestGap} days
          </p>
          <ul>
            {days.map((d, i) => (
              <li key={d}>
                {d}: {money(Number(amounts[i]))}
              </li>
            ))}
          </ul>
          <p className="text-sm">
            This is not a dated 30-day forecast or a bank balance. No opening
            balance, bills, business expenses or tax payments are deducted. A
            repeating zero-deposit week displays a 7-day gap; an actual gap
            could be longer.
          </p>
        </section>
      )}
      <section className="my-8 space-y-4">
        <h2 className="text-xl font-semibold">Assumptions to check</h2>
        <p>
          Initiating a payout is different from receiving it. Bank processing,
          weekends, holidays, eligibility, holds and account settings can change
          timing. Verify any instant-pay fee in the app before cashing out.
        </p>
        <p>
          Enter amounts after payout fees. Count a cash-out only once: an
          instant withdrawal reduces the later regular deposit. These cash
          receipts are not necessarily gross taxable revenue or business profit.
        </p>
        <p>
          For multiple deposits on one day, add them together. Enter zero on
          days without expected deposits. Adjust this scenario whenever income
          or account settings change.
        </p>
        <a
          className="text-primary underline"
          href="https://help.uber.com/driving-and-delivering/article/direct-deposit-late-or-missing?nodeId=38e1f3a9-139a-4cd9-90f3-daaa9158710b"
        >
          Uber: bank processing and missing deposits
        </a>
      </section>
      <section
        aria-labelledby="dave-paid-endorsement"
        className="my-8 space-y-4 rounded-xl border bg-muted/40 p-5"
      >
        <h2 id="dave-paid-endorsement" className="text-lg font-semibold">
          Paid endorsement. Supported by AI.
        </h2>
        <p>
          Even with diversified payout days, a Tuesday car repair can land
          before the next payout. Dave is built for that specific squeeze.
          Eligible members could qualify for up to $500 in 5 minutes or less
          with ExtraCash®.
          <sup>
            <a
              aria-label="Footnote 1: ExtraCash eligibility, fees and terms"
              className="text-primary underline"
              href="#dave-extracash-terms"
            >
              1
            </a>
          </sup>{" "}
          There’s no credit check. Dave could help get the cash you need and
          settle up later.
        </p>
        <p>Check your eligibility in the Dave app.</p>
        <p>
          For gig workers juggling gas, insurance, and rent against staggered
          payouts, having a backup for the week the math does not work may help
          cover a short-term cash gap.
        </p>
        <p>
          Dave is not a bank. Banking services provided by Coastal Community
          Bank, Member FDIC. The Dave Debit Card is issued under a license from
          Mastercard®.
        </p>
        <p id="dave-extracash-terms" className="text-sm">
          <sup>1</sup> ExtraCash amounts range from $25-$500, typically
          authorized within 5 minutes, with an overdraft fee equal to the
          greater of $5 or 5%. Multiple overdrafts may be required.{" "}
          <strong>
            Not all members qualify for ExtraCash and few qualify for $500.
          </strong>{" "}
          ExtraCash is repayable on demand. Must open an ExtraCash overdraft
          deposit account and Dave Checking account. Up to $5 monthly membership
          fee for ExtraCash, Income Opportunity Services, and Financial
          Management Services. Optional 1.5% fee for external debit card
          transfers. See dave.com.
        </p>
      </section>
      <section className="my-8 space-y-4">
        <h2 className="text-xl font-semibold">Common questions</h2>
        {FAQS.map(({ q, a }) => (
          <div key={q}>
            <h3 className="font-semibold">{q}</h3>
            <p>{a}</p>
          </div>
        ))}
      </section>
    </ToolLayout>
  );
}
