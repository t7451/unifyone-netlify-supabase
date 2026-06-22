import { describe, it, expect } from "vitest";
import {
  buildWhyPrompt,
  extractSummaryText,
  hasInsightData,
  type WhySummaryInput,
} from "../lib/whySummary";
import type { InvokeResult } from "../_core/llm";

function makeInput(overrides: Partial<WhySummaryInput> = {}): WhySummaryInput {
  return {
    days: 30,
    behavior: {
      productViews: 120,
      addToCarts: 30,
      checkoutStarts: 12,
      purchases: 5,
      uniqueVisitors: 80,
      searches: 40,
      viewToCartRate: 25,
      checkoutToPurchaseRate: 41.7,
      cartAbandonment: 58.3,
    },
    funnel: {
      viewed: 80,
      carted: 24,
      checkedOut: 10,
      purchased: 5,
      viewToCart: 70,
      cartToCheckout: 58.3,
      checkoutToPurchase: 50,
    },
    topSearches: [{ query: "blue widget", searches: 14, avgResults: 0 }],
    topViewed: [{ productName: "Widget Pro", views: 60, viewToCartRate: 18 }],
    surveys: {
      total: 7,
      topAnswers: [
        { surveyType: "exit_intent", answer: "Price was too high", count: 4 },
      ],
    },
    ...overrides,
  };
}

describe("hasInsightData", () => {
  it("is false when there is no behavior, funnel, or survey data", () => {
    const empty = makeInput({
      behavior: {
        productViews: 0,
        addToCarts: 0,
        checkoutStarts: 0,
        purchases: 0,
        uniqueVisitors: 0,
        searches: 0,
        viewToCartRate: 0,
        checkoutToPurchaseRate: 0,
        cartAbandonment: 0,
      },
      funnel: {
        viewed: 0,
        carted: 0,
        checkedOut: 0,
        purchased: 0,
        viewToCart: 0,
        cartToCheckout: 0,
        checkoutToPurchase: 0,
      },
      topSearches: [],
      topViewed: [],
      surveys: { total: 0, topAnswers: [] },
    });
    expect(hasInsightData(empty)).toBe(false);
  });

  it("is true once any signal exists", () => {
    expect(hasInsightData(makeInput())).toBe(true);
  });
});

describe("buildWhyPrompt", () => {
  it("includes funnel, search, product, and survey signals", () => {
    const prompt = buildWhyPrompt(makeInput());
    expect(prompt).toContain("last 30 days");
    expect(prompt).toContain("Viewed a product: 80");
    expect(prompt).toContain("blue widget");
    expect(prompt).toContain("Widget Pro");
    expect(prompt).toContain("Price was too high");
  });

  it("omits sections that have no data", () => {
    const prompt = buildWhyPrompt(
      makeInput({
        topSearches: [],
        topViewed: [],
        surveys: { total: 0, topAnswers: [] },
      })
    );
    expect(prompt).not.toContain("Top searches");
    expect(prompt).not.toContain("Survey answers");
  });
});

describe("extractSummaryText", () => {
  it("reads a plain string content", () => {
    const result = {
      choices: [{ message: { content: "  Hello world  " } }],
    } as unknown as InvokeResult;
    expect(extractSummaryText(result)).toBe("Hello world");
  });

  it("concatenates array text parts", () => {
    const result = {
      choices: [
        {
          message: {
            content: [
              { type: "text", text: "Part 1. " },
              { type: "text", text: "Part 2." },
            ],
          },
        },
      ],
    } as unknown as InvokeResult;
    expect(extractSummaryText(result)).toBe("Part 1. Part 2.");
  });

  it("returns empty string when there is no content", () => {
    expect(extractSummaryText({ choices: [] } as unknown as InvokeResult)).toBe(
      ""
    );
  });
});
