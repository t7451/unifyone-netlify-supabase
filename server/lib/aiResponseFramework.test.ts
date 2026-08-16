import { describe, it, expect } from "vitest";
import {
  polishResponse,
  scoreResponseHeuristics,
  shouldRefine,
  resolveQualityMode,
  withQualityContract,
  tryParseStructuredAnswer,
  formatStructuredAnswer,
} from "./aiResponseFramework";

describe("aiResponseFramework", () => {
  it("strips filler openers", () => {
    expect(polishResponse("Certainly! Your rate is $28/hr.")).toBe(
      "Your rate is $28/hr."
    );
    expect(polishResponse("Great question! Check the dashboard.")).toBe(
      "Check the dashboard."
    );
  });

  it("scores specific actionable replies higher than vague ones", () => {
    const good = scoreResponseHeuristics(
      "You earned $412 this week at $24.50/hr. Next: take Friday dinner shifts in SE Portland.",
      { expectNumbers: true }
    );
    const bad = scoreResponseHeuristics(
      "Certainly! It depends on many factors. Generally speaking there are various ways to improve.",
      { expectNumbers: true, userMessage: "How should I improve earnings?" }
    );
    expect(good.score).toBeGreaterThan(bad.score);
    expect(bad.issues.length).toBeGreaterThan(0);
  });

  it("shouldRefine respects quality mode thresholds", () => {
    const poor = { score: 50, issues: ["filler_opener"], strengths: [] };
    const ok = { score: 90, issues: [], strengths: ["has_numbers"] };
    expect(shouldRefine("fast", poor)).toBe(false);
    expect(shouldRefine("standard", poor)).toBe(true);
    expect(shouldRefine("high", ok)).toBe(false);
    expect(shouldRefine("high", { ...ok, issues: ["mild_vagueness"] })).toBe(
      true
    );
  });

  it("resolveQualityMode defaults by model tier", () => {
    expect(resolveQualityMode(undefined, { premiumModel: true })).toBe("high");
    expect(resolveQualityMode(undefined, { premiumModel: false })).toBe(
      "standard"
    );
    expect(resolveQualityMode("fast")).toBe("fast");
  });

  it("withQualityContract is idempotent", () => {
    const base = "You are Kai.";
    const once = withQualityContract(base);
    const twice = withQualityContract(once);
    expect(once).toContain("Response quality contract");
    expect(twice).toBe(once);
  });

  it("parses and formats structured answers", () => {
    const raw = JSON.stringify({
      answer: "Run dinner shifts Fri–Sat.",
      confidence: "high",
      keyFacts: ["$28/hr peak"],
      nextActions: ["Open Gig Command"],
      caveats: ["Demand varies by weather"],
    });
    const parsed = tryParseStructuredAnswer(raw);
    expect(parsed?.answer).toContain("dinner");
    const formatted = formatStructuredAnswer(parsed!);
    expect(formatted).toContain("Key facts");
    expect(formatted).toContain("Next actions");
  });
});
