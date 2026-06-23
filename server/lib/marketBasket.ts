/**
 * Market-basket "viewed together" computation.
 *
 * Pure function (no DB) so it's unit-testable: given flat (visitor, productId)
 * rows, count how often each unordered product pair was viewed by the same
 * visitor, and return the top pairs.
 *
 * Guards against quadratic blow-up: visitors who viewed more than `maxBasket`
 * distinct products are skipped (likely bots/crawlers, and the pair count would
 * explode), and only pairs seen by at least `minCoViewers` distinct visitors
 * are returned.
 */

export type CoViewRow = { visitor: string | null; productId: number | null };

export type ProductPair = {
  productAId: number;
  productBId: number;
  coViewers: number;
};

export function computeViewedTogether(
  rows: CoViewRow[],
  opts: { limit?: number; maxBasket?: number; minCoViewers?: number } = {}
): ProductPair[] {
  const limit = opts.limit ?? 10;
  const maxBasket = opts.maxBasket ?? 50;
  const minCoViewers = opts.minCoViewers ?? 2;

  // Group distinct productIds per visitor.
  const baskets = new Map<string, Set<number>>();
  for (const r of rows) {
    if (!r.visitor || r.productId == null) continue;
    let set = baskets.get(r.visitor);
    if (!set) {
      set = new Set();
      baskets.set(r.visitor, set);
    }
    set.add(r.productId);
  }

  // Tally co-viewed pairs (productAId < productBId for a stable key).
  const pairCounts = new Map<string, number>();
  for (const set of Array.from(baskets.values())) {
    if (set.size < 2 || set.size > maxBasket) continue;
    const ids = Array.from(set).sort((a, b) => a - b);
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const key = `${ids[i]}:${ids[j]}`;
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
      }
    }
  }

  return Array.from(pairCounts.entries())
    .filter(([, count]) => count >= minCoViewers)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, coViewers]) => {
      const [a, b] = key.split(":").map(Number);
      return { productAId: a, productBId: b, coViewers };
    });
}
