// Shared pure formatting helpers extracted from duplicated per-page copies.
// Output is byte-identical to the original inline implementations.

/**
 * Format a number as a whole-dollar USD currency string (no fractional cents).
 * Equivalent to:
 *   n.toLocaleString("en-US", {
 *     style: "currency",
 *     currency: "USD",
 *     maximumFractionDigits: 0,
 *   })
 */
export function formatUsd0(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

/**
 * Format a number as a USD currency string with up to two fractional digits.
 * Equivalent to:
 *   n.toLocaleString("en-US", {
 *     style: "currency",
 *     currency: "USD",
 *     maximumFractionDigits: 2,
 *   })
 */
export function formatUsd2(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

/**
 * Format a (possibly null/undefined) number with locale-default grouping.
 * Equivalent to: Number(value ?? 0).toLocaleString()
 */
export function formatNumber(value: number): string {
  return Number(value ?? 0).toLocaleString();
}
