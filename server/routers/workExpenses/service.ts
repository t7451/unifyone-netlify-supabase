import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as repo from "./repo";
import {
  resolveExpenseRange,
  resolveExpenseReportingDate,
  validCalendarDate,
} from "./periods";

export const EXPENSE_CATEGORIES = [
  "fuel",
  "maintenance",
  "insurance",
  "tolls",
  "parking",
  "supplies",
  "software",
  "fees",
  "other",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(validCalendarDate, "Choose a real calendar date.");
export const createExpenseInput = z.object({
  clientReference: z
    .string()
    .uuid()
    .transform(value => value.toLowerCase()),
  expenseDate: date,
  amountCents: z.number().finite().int().positive().max(99_999_999),
  category: z.enum(EXPENSE_CATEGORIES),
  merchant: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(1000).optional(),
});
export const listExpensesInput = z.object({
  period: z.enum(["week", "month", "year", "all"]).default("month"),
  limit: z.number().int().min(1).max(100).default(25),
  offset: z.number().int().min(0).max(100_000).default(0),
  asOfDate: date.optional(),
});
export type CreateExpenseInput = z.input<typeof createExpenseInput>;
export type CanonicalExpense = {
  clientReference: string;
  expenseDate: string;
  amountCents: number;
  category: ExpenseCategory;
  merchant: string | null;
  notes: string | null;
};
export type ListExpensesInput = z.input<typeof listExpensesInput>;

export function canonicalExpense(
  input: CreateExpenseInput,
  now = Date.now()
): CanonicalExpense {
  const parsed = createExpenseInput.safeParse(input);
  if (!parsed.success)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: parsed.error.issues[0]?.message ?? "Check this expense.",
    });
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  // A declared local today may be one date ahead of UTC, but not a future bill.
  if (
    Date.parse(`${parsed.data.expenseDate}T00:00:00Z`) >
    today.getTime() + 86400000
  )
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Expense dates cannot be in the future. Use the local date when you paid.",
    });
  return {
    ...parsed.data,
    merchant: parsed.data.merchant || null,
    notes: parsed.data.notes || null,
  };
}
export function sameExpense(
  stored: repo.StoredExpense,
  input: CanonicalExpense
) {
  return (
    stored.expenseDate === input.expenseDate &&
    stored.amountCents === input.amountCents &&
    stored.category === input.category &&
    stored.merchant === input.merchant &&
    stored.notes === input.notes
  );
}
export async function create(userId: number, input: CreateExpenseInput) {
  const expense = canonicalExpense(input);
  await repo.insert(userId, expense);
  // Fresh owner-scoped read sees a concurrent identical save after conflict wait.
  const stored = await repo.findByReference(userId, expense.clientReference);
  if (!stored)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        "The saved expense could not be confirmed. Retry the same details.",
    });
  if (!sameExpense(stored, expense))
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "This save reference already belongs to a different expense. The original was kept.",
    });
  return { id: stored.id };
}
function safeTotal(value: string | number) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "These expense totals exceed the supported range. Choose a shorter period.",
    });
  return number;
}
export async function list(
  userId: number,
  input: ListExpensesInput = {},
  now = Date.now()
) {
  const parsed = listExpensesInput.safeParse(input);
  if (!parsed.success)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        parsed.error.issues[0]?.message ?? "Choose a valid expense period.",
    });
  let asOfDate: string;
  try {
    asOfDate = resolveExpenseReportingDate(parsed.data.asOfDate, now);
  } catch {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The reporting date must match your local today.",
    });
  }
  const range = resolveExpenseRange(parsed.data.period, asOfDate);
  const result = await repo.list(
    userId,
    range,
    parsed.data.limit,
    parsed.data.offset
  );
  const totalsByCategory = result.totalsByCategory.map(row => ({
    category: row.category,
    amountCents: safeTotal(row.amountCents),
    count: safeTotal(row.count),
  }));
  const totalAmountCents = safeTotal(
    totalsByCategory.reduce((sum, row) => sum + row.amountCents, 0)
  );
  const totalEntries = safeTotal(
    totalsByCategory.reduce((sum, row) => sum + row.count, 0)
  );
  return {
    entries: result.entries,
    totalEntries,
    totalAmountCents,
    totalsByCategory,
    range,
    limit: parsed.data.limit,
    offset: parsed.data.offset,
  };
}
export async function remove(userId: number, expenseId: number) {
  await repo.remove(userId, expenseId);
  // Deletion retries and unowned IDs have the same harmless response.
  return { removed: true as const };
}
