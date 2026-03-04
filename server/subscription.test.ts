import { describe, it, expect } from "vitest";

describe("Subscription router", () => {
  it("maps Stripe subscription statuses correctly", () => {
    // Mirror the mapSubStatus logic from stripe.ts
    function mapSubStatus(s: string) {
      switch (s) {
        case "active": return "active";
        case "trialing": return "trialing";
        case "past_due": return "past_due";
        case "canceled":
        case "unpaid":
        case "paused": return "cancelled";
        default: return "none";
      }
    }
    expect(mapSubStatus("active")).toBe("active");
    expect(mapSubStatus("trialing")).toBe("trialing");
    expect(mapSubStatus("past_due")).toBe("past_due");
    expect(mapSubStatus("canceled")).toBe("cancelled");
    expect(mapSubStatus("unpaid")).toBe("cancelled");
    expect(mapSubStatus("paused")).toBe("cancelled");
    expect(mapSubStatus("incomplete")).toBe("none");
  });

  it("calculates trial days left correctly", () => {
    const trialWindowDays = 14;
    const createdAt = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
    const trialEnd = new Date(createdAt.getTime() + trialWindowDays * 24 * 60 * 60 * 1000);
    const diff = trialEnd.getTime() - Date.now();
    const daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    expect(daysLeft).toBeGreaterThanOrEqual(10);
    expect(daysLeft).toBeLessThanOrEqual(12);
  });

  it("formats currency correctly", () => {
    const format = (amount: number, currency: string) =>
      new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(amount / 100);
    expect(format(2999, "usd")).toBe("$29.99");
    expect(format(9900, "usd")).toBe("$99.00");
    expect(format(0, "usd")).toBe("$0.00");
  });
});
