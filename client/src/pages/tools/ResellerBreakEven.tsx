import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import PageHead from "@/components/PageHead";
import { SITE_URL } from "@/lib/siteConfig";
import { resellerPrice } from "@shared/publicToolMath";
const fields = [
  [
    "itemCost",
    "Item acquisition cost ($)",
    "Cost of the item, not a tax deduction determination.",
  ],
  [
    "shipping",
    "Shipping and packaging you pay ($)",
    "Include fulfillment costs. Calculated selling price includes any buyer-paid shipping you retain.",
  ],
  [
    "fixedFees",
    "Fixed fees and allocated overhead ($)",
    "Include per-order/listing fees, fulfillment, storage and other costs not in the percentage.",
  ],
  [
    "feePercent",
    "Combined percentage fee (%)",
    "Enter the rate for your account, category and fee base. No platform preset is assumed.",
  ],
  [
    "feeBaseExtra",
    "Additional amount subject to the percentage fee ($)",
    "For example, buyer sales tax when the platform charges fees on it. This amount is not seller revenue. If fee components use different bases, calculate the extra charge separately in fixed fees.",
  ],
  [
    "returnAllowance",
    "Expected unrecovered return costs per sale ($)",
    "Use your own average losses after recoveries, fee refunds and resale value. A return rate alone does not establish a dollar loss.",
  ],
  [
    "targetRoi",
    "Target profit as % of item acquisition cost",
    "This is ROI on item cost, not profit margin. Margin uses selling price as the denominator.",
  ],
] as const;
type Key = (typeof fields)[number][0];
const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const FAQS = [
  {
    q: "Does this include every marketplace fee automatically?",
    a: "No. Enter account-specific percentage fees, fixed charges, any extra fee base and expected unrecovered return costs. Verify tiers and minimums against your fee schedule.",
  },
  {
    q: "Is ROI the same as profit margin?",
    a: "No. This tool divides profit by item acquisition cost for ROI and by seller revenue for margin. Seller revenue includes retained buyer shipping and excludes remitted sales tax.",
  },
];
const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Reseller Break-Even & Pricing Calculator",
    url: `${SITE_URL}/tools/reseller-break-even`,
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
export default function ResellerBreakEven() {
  const [values, setValues] = useState<Record<Key, string>>({
    itemCost: "",
    shipping: "0",
    fixedFees: "0",
    feePercent: "",
    feeBaseExtra: "0",
    returnAllowance: "0",
    targetRoi: "25",
  });
  const [show, setShow] = useState(false);
  const valid =
    fields.every(
      ([key]) =>
        values[key].trim() !== "" &&
        Number.isFinite(Number(values[key])) &&
        Number(values[key]) >= 0 &&
        Number(values[key]) <= 1e9
    ) && Number(values.feePercent) < 100;
  const result = valid
    ? resellerPrice(
        Object.fromEntries(
          fields.map(([key]) => [key, Number(values[key])])
        ) as Record<Key, number>
      )
    : null;
  return (
    <ToolLayout toolName="Reseller Break-Even" breadcrumb="Reseller Break-Even">
      <PageHead
        jsonLd={jsonLd}
        title="Reseller Break-Even & Pricing Calculator | UnifyOne"
        description="Estimate a selling price using your actual fee structure, fixed costs and expected return losses. Distinguishes item-cost ROI from profit margin."
        canonical={`${SITE_URL}/tools/reseller-break-even`}
      />
      <header className="mb-8">
        <p className="text-sm text-primary">
          Free tool · Reviewed November 7, 2026
        </p>
        <h1 className="text-3xl font-bold my-4">
          Reseller Break-Even & Pricing Calculator
        </h1>
        <p>
          Model costs for your account. Marketplace fees vary by category, plan,
          transaction and country; a headline fee rarely includes every charge.
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
        {fields.map(([key, label, hint]) => (
          <div key={key}>
            <label htmlFor={key} className="block font-medium mb-2">
              {label}
            </label>
            <input
              id={key}
              required
              type="number"
              min="0"
              max={key === "feePercent" ? 99.999 : 1e9}
              step="any"
              value={values[key]}
              onChange={e => setValues({ ...values, [key]: e.target.value })}
              className="w-full border rounded p-3 bg-background"
            />
            <p className="text-sm text-muted-foreground mt-2">{hint}</p>
          </div>
        ))}
        <button
          disabled={!valid}
          className="w-full bg-primary text-primary-foreground rounded p-3 disabled:opacity-40"
        >
          Calculate break-even price
        </button>
      </form>
      {show && result && (
        <section role="status" className="my-8 rounded-xl border p-5 space-y-3">
          <h2 className="font-semibold text-xl">Estimated pricing</h2>
          <p>
            Break-even seller revenue:{" "}
            <strong>{money(result.breakEven)}</strong>
          </p>
          <p>
            Target seller revenue: <strong>{money(result.targetPrice)}</strong>
          </p>
          <p>Profit at target: {money(result.profit)}</p>
          <p>
            ROI on item cost:{" "}
            {result.roi === null
              ? "Not applicable at zero item cost"
              : `${result.roi.toFixed(2)}%`}
          </p>
          <p>
            Profit margin:{" "}
            {result.margin === null
              ? "Not applicable at zero revenue"
              : `${result.margin.toFixed(2)}%`}
          </p>
          <p className="text-sm">
            Prices are rounded up to cents. Seller revenue includes buyer
            shipping retained by you, excludes sales tax collected for
            remittance. Subtract any separately charged buyer shipping to obtain
            the item-only price. Income taxes, unentered costs and fee
            tiers/minimums are not calculated.
          </p>
        </section>
      )}
      <section className="my-8 space-y-4">
        <h2 className="font-semibold text-xl">How the estimate works</h2>
        <p>
          Break-even revenue = (item cost + shipping + fixed fees + expected
          return losses + fees on the extra fee base) ÷ (1 − percentage fee).
          Target revenue adds your desired profit before dividing. All fee
          components must be counted once.
        </p>
        <p>
          No universal return rate, fee rate or profitable margin is assumed.
          For multiple fee bases, tiers, minimum charges or fee refunds, use the
          platform statement to model the effective costs for your expected
          price and recheck after calculating.
        </p>
        <h2 className="font-semibold text-xl">
          Check your current fee schedule
        </h2>
        <ul className="space-y-2">
          <li>
            <a
              className="text-primary underline"
              href="https://www.ebay.com/help/selling/fees-credits-invoices/fee-tables?id=4822"
            >
              eBay selling fees
            </a>
          </li>
          <li>
            <a
              className="text-primary underline"
              href="https://help.etsy.com/hc/en-us/articles/360035902374-Etsy-Fee-Basics"
            >
              Etsy fee components
            </a>
          </li>
          <li>
            <a
              className="text-primary underline"
              href="https://sell.amazon.com/pricing"
            >
              Amazon selling plans and fees
            </a>
          </li>
        </ul>
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
