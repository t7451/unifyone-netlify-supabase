/** Plain calendar dates: no browser timezone is inferred from a UTC instant. */
export type ExpensePeriod = "week" | "month" | "year" | "all";
export function validCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000-"))
    return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
export function resolveExpenseReportingDate(
  asOfDate?: string,
  now = Date.now()
) {
  const today = new Date(now).toISOString().slice(0, 10);
  const selected = asOfDate ?? today;
  if (
    !validCalendarDate(selected) ||
    Math.abs(
      Date.parse(`${selected}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)
    ) > 86400000
  )
    throw new Error("The reporting date must match your local today.");
  return selected;
}
export function resolveExpenseRange(period: ExpensePeriod, asOfDate: string) {
  if (!validCalendarDate(asOfDate))
    throw new Error("A real calendar date is required.");
  let startDate: string | null = null;
  if (period === "week") {
    const start = new Date(`${asOfDate}T00:00:00Z`);
    start.setUTCDate(start.getUTCDate() - 6);
    startDate = start.toISOString().slice(0, 10);
  } else if (period === "month") startDate = `${asOfDate.slice(0, 7)}-01`;
  else if (period === "year") startDate = `${asOfDate.slice(0, 4)}-01-01`;
  return { startDate, endDate: asOfDate };
}
