import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as repo from "./repo";

const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(value => {
    const date = new Date(`${value}T00:00:00Z`);
    return (
      value >= "0001-01-01" &&
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }, "Choose a real calendar date.");
export const historyInput = z
  .object({
    from: z.string().datetime({ offset: true }),
    before: z.string().datetime({ offset: true }),
    fromDate: calendarDate.optional(),
    beforeDate: calendarDate.optional(),
    source: z.string().min(1).max(100).optional(),
    query: z.string().trim().max(100).optional(),
    limit: z.number().int().min(1).max(100).default(25),
    offset: z.number().int().min(0).max(100_000).default(0),
  })
  .refine(input => Date.parse(input.from) < Date.parse(input.before), {
    message: "The end of the history period must be after its start.",
  })
  .refine(
    input =>
      (input.fromDate === undefined) === (input.beforeDate === undefined),
    { message: "Provide both calendar bounds for imported statements." }
  )
  .refine(
    input =>
      !input.fromDate || !input.beforeDate || input.fromDate < input.beforeDate,
    { message: "The statement end date must be after its start date." }
  );
export type HistoryInput = z.output<typeof historyInput>;
const numeric = z
  .union([z.string(), z.number()])
  .transform(value => Number(value))
  .refine(
    value => Number.isFinite(value) && value >= 0,
    "Invalid recorded amount."
  );
const count = numeric.refine(Number.isSafeInteger);
const dollars = numeric.refine(
  value => Number.isSafeInteger(Math.round(value * 100)),
  "Recorded totals exceed the supported range."
);
const stored = z.object({
  entries: z.array(
    z.object({
      kind: z.enum(["manual", "timer", "import"]),
      id: count,
      source: z.string(),
      startedAt: z.string().datetime(),
      endedAt: z.string().datetime().nullable(),
      earningsUSD: dollars,
      base: dollars,
      tips: dollars,
      bonuses: dollars,
      hours: numeric.nullable(),
      miles: numeric.nullable(),
      importBatchId: count.nullable(),
    })
  ),
  totalEntries: count,
  totalEarningsUSD: dollars,
  totalRecordedHours: numeric,
  unknownHoursCount: count,
  totalRecordedMiles: numeric,
  unknownMilesCount: count,
  sources: z.array(z.string()),
});
export async function list(
  userId: number,
  input: z.input<typeof historyInput>
) {
  const parsed = historyInput.safeParse(input);
  if (!parsed.success)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        parsed.error.issues[0]?.message ??
        "Choose a valid work history period.",
    });
  const raw = await repo.load(userId, parsed.data);
  const data = stored.safeParse(raw);
  if (!data.success)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        "Work history could not be read reliably. Try a shorter period or retry.",
    });
  return {
    ...data.data,
    from: parsed.data.from,
    before: parsed.data.before,
    fromDate: parsed.data.fromDate ?? null,
    beforeDate: parsed.data.beforeDate ?? null,
    importDatePolicy: parsed.data.fromDate
      ? ("utc-calendar" as const)
      : ("instant" as const),
    limit: parsed.data.limit,
    offset: parsed.data.offset,
  };
}
