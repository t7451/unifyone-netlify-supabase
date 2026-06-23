import { describe, it, expect } from "vitest";
import { computeViewedTogether } from "../lib/marketBasket";

describe("computeViewedTogether", () => {
  it("counts unordered pairs co-viewed by the same visitor", () => {
    const rows = [
      // visitor A viewed 1 and 2
      { visitor: "a", productId: 1 },
      { visitor: "a", productId: 2 },
      // visitor B viewed 1 and 2
      { visitor: "b", productId: 2 },
      { visitor: "b", productId: 1 },
      // visitor C viewed only 1
      { visitor: "c", productId: 1 },
    ];
    const out = computeViewedTogether(rows, { minCoViewers: 2 });
    expect(out).toEqual([{ productAId: 1, productBId: 2, coViewers: 2 }]);
  });

  it("dedupes repeated views by the same visitor", () => {
    const rows = [
      { visitor: "a", productId: 1 },
      { visitor: "a", productId: 1 },
      { visitor: "a", productId: 2 },
      { visitor: "b", productId: 1 },
      { visitor: "b", productId: 2 },
    ];
    const out = computeViewedTogether(rows, { minCoViewers: 2 });
    expect(out).toEqual([{ productAId: 1, productBId: 2, coViewers: 2 }]);
  });

  it("filters out pairs below minCoViewers and ranks by frequency", () => {
    const rows = [
      { visitor: "a", productId: 1 },
      { visitor: "a", productId: 2 },
      { visitor: "b", productId: 1 },
      { visitor: "b", productId: 2 },
      { visitor: "c", productId: 1 },
      { visitor: "c", productId: 2 },
      { visitor: "d", productId: 3 },
      { visitor: "d", productId: 4 },
    ];
    const out = computeViewedTogether(rows, { minCoViewers: 2, limit: 5 });
    expect(out).toEqual([{ productAId: 1, productBId: 2, coViewers: 3 }]);
  });

  it("skips oversized baskets and null rows", () => {
    const big = Array.from({ length: 60 }, (_, i) => ({
      visitor: "bot",
      productId: i + 1,
    }));
    const rows = [
      ...big,
      { visitor: null, productId: 1 },
      { visitor: "x", productId: null },
    ];
    expect(computeViewedTogether(rows, { maxBasket: 50 })).toEqual([]);
  });
});
