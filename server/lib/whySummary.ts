/**
 * "Why" summary — turns the first-party behavioral + survey signals into a
 * compact prompt and extracts the model's plain-English narrative.
 *
 * The prompt builder is a pure function so it can be unit-tested without the
 * LLM. The system prompt constrains the model to ground its answer ONLY in the
 * provided data (no invented numbers) and to stay concise + actionable.
 */

import type { InvokeResult } from "../_core/llm";

export type WhySummaryInput = {
  days: number;
  behavior: {
    productViews: number;
    addToCarts: number;
    checkoutStarts: number;
    purchases: number;
    uniqueVisitors: number;
    searches: number;
    viewToCartRate: number;
    checkoutToPurchaseRate: number;
    cartAbandonment: number;
  };
  funnel: {
    viewed: number;
    carted: number;
    checkedOut: number;
    purchased: number;
    viewToCart: number;
    cartToCheckout: number;
    checkoutToPurchase: number;
  };
  topSearches: Array<{ query: string; searches: number; avgResults: number }>;
  topViewed: Array<{
    productName: string;
    views: number;
    viewToCartRate: number;
  }>;
  surveys: {
    total: number;
    topAnswers: Array<{ surveyType: string; answer: string; count: number }>;
  };
};

export const WHY_SYSTEM_PROMPT = `You are an e-commerce analyst. Using ONLY the data provided, explain in plain English WHY customers are or aren't buying.

Rules:
- Ground every claim in the supplied numbers; never invent figures or facts.
- Be concise: ~150-220 words total.
- Structure as three short labelled sections: "What's working", "Where you're losing them", and "Do next" (2-3 concrete, specific actions).
- If the data is too thin to draw a conclusion, say so plainly instead of guessing.
- No preamble, no restating the raw numbers verbatim — interpret them.`;

/** True when there's essentially nothing to analyze yet. */
export function hasInsightData(input: WhySummaryInput): boolean {
  return (
    input.behavior.productViews +
      input.behavior.purchases +
      input.funnel.viewed +
      input.surveys.total >
    0
  );
}

export function buildWhyPrompt(input: WhySummaryInput): string {
  const { behavior: b, funnel: f } = input;
  const lines: string[] = [];
  lines.push(`Window: last ${input.days} days.`);
  lines.push("");
  lines.push("Funnel (distinct visitors):");
  lines.push(
    `- Viewed a product: ${f.viewed}; added to cart: ${f.carted} (${f.viewToCart}% lost from view→cart); started checkout: ${f.checkedOut} (${f.cartToCheckout}% lost cart→checkout); purchased: ${f.purchased} (${f.checkoutToPurchase}% lost checkout→purchase).`
  );
  lines.push("");
  lines.push("Event volumes:");
  lines.push(
    `- ${b.uniqueVisitors} unique visitors, ${b.productViews} product views, ${b.addToCarts} add-to-carts, ${b.checkoutStarts} checkout starts, ${b.purchases} purchases, ${b.searches} searches.`
  );
  lines.push(
    `- View→cart rate ${b.viewToCartRate}%, checkout→purchase rate ${b.checkoutToPurchaseRate}%, cart abandonment ${b.cartAbandonment}%.`
  );

  if (input.topViewed.length) {
    lines.push("");
    lines.push("Most-viewed products (name · views · view→cart %):");
    for (const p of input.topViewed.slice(0, 8)) {
      lines.push(`- ${p.productName} · ${p.views} · ${p.viewToCartRate}%`);
    }
  }

  if (input.topSearches.length) {
    lines.push("");
    lines.push("Top searches (query · count · avg results):");
    for (const s of input.topSearches.slice(0, 10)) {
      lines.push(`- "${s.query}" · ${s.searches} · ${s.avgResults}`);
    }
  }

  if (input.surveys.topAnswers.length) {
    lines.push("");
    lines.push("Survey answers (type · answer · count):");
    for (const a of input.surveys.topAnswers.slice(0, 12)) {
      lines.push(`- ${a.surveyType} · "${a.answer}" · ${a.count}`);
    }
  }

  return lines.join("\n");
}

/** Pull the assistant's text out of an InvokeResult (string or parts). */
export function extractSummaryText(result: InvokeResult): string {
  const content = result.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map(part => (part && "text" in part ? part.text : ""))
      .join("")
      .trim();
  }
  return "";
}
