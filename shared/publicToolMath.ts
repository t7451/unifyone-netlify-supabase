/** Business planning arithmetic, not tax deductions or platform fee schedules. */
export function resellerPrice(input: {
  itemCost: number;
  shipping: number;
  fixedFees: number;
  feePercent: number;
  feeBaseExtra: number;
  returnAllowance: number;
  targetRoi: number;
}) {
  if (
    !Object.values(input).every(
      v => Number.isFinite(v) && v >= 0 && v <= 1e9
    ) ||
    input.feePercent >= 100
  )
    throw new RangeError("Invalid cost or fee input.");
  const {
    itemCost,
    shipping,
    fixedFees,
    feePercent,
    feeBaseExtra,
    returnAllowance,
    targetRoi,
  } = input;
  const rate = feePercent / 100;
  const cost =
    itemCost + shipping + fixedFees + returnAllowance + feeBaseExtra * rate;
  // Price includes any buyer-paid shipping retained by the seller, excludes sales tax.
  const breakEven = cost / (1 - rate);
  const target = (cost + (itemCost * targetRoi) / 100) / (1 - rate);
  const roundUp = (n: number) => Math.ceil(n * 100 - 1e-8) / 100;
  const targetPrice = roundUp(target);
  const profit = targetPrice * (1 - rate) - cost;
  return {
    breakEven: roundUp(breakEven),
    targetPrice,
    profit,
    roi: itemCost > 0 ? (profit / itemCost) * 100 : null,
    margin: targetPrice > 0 ? (profit / targetPrice) * 100 : null,
  };
}
export function weeklyCashflow(amounts: number[]) {
  if (
    amounts.length !== 7 ||
    !amounts.every(n => Number.isFinite(n) && n >= 0 && n <= 1e9)
  )
    throw new RangeError("Enter seven non-negative daily amounts.");
  const weekly = amounts.reduce((a, b) => a + b, 0);
  let run = 0,
    longest = 0;
  for (let i = 0; i < 14; i++) {
    run = amounts[i % 7] > 0 ? 0 : run + 1;
    longest = Math.max(longest, run);
  }
  return {
    weekly,
    monthlyAverage: (weekly * 52) / 12,
    payoutDays: amounts.filter(n => n > 0).length,
    longestGap: Math.min(7, longest),
  };
}
