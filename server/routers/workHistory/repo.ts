import { sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "../../db";
import type { HistoryInput } from "./service";

/** A literal substring, never a user-supplied SQL LIKE pattern. */
export const escapeLike = (value: string) => value.replace(/[\\%_]/g, "\\$&");

/** One snapshot supplies the page, complete filtered totals, and owner source options. */
export function historyQuery(userId: number, input: HistoryInput) {
  const source =
    input.source === undefined ? sql`true` : sql`source = ${input.source}`;
  const query = input.query
    ? sql`source ilike ${`%${escapeLike(input.query)}%`} escape ${"\\"}`
    : sql`true`;
  const instantRange = sql`started >= (${input.from}::timestamptz at time zone 'UTC') and started < (${input.before}::timestamptz at time zone 'UTC')`;
  // Date-only CSV statements are normalized to UTC midnight. Honor their saved
  // calendar date independently of the worker's local session-day boundaries.
  const range =
    input.fromDate && input.beforeDate
      ? sql`((kind = 'import' and started >= ${input.fromDate}::date::timestamp and started < ${input.beforeDate}::date::timestamp) or (kind <> 'import' and ${instantRange}))`
      : instantRange;
  return sql`
    with owned as (
      select case when "entrySource" = 'manual' then 'manual' else 'timer' end as kind,
        id, platform as source, "startTime" as started, "endTime" as ended,
        "grossEarnings" as base, tips, bonuses,
        case when "durationMinutes" >= 0 then "durationMinutes"::numeric / 60 else null end as hours,
        "totalMiles" as miles, null::integer as batch
      from gig_shifts where "userId" = ${userId} and status = 'completed'
        and "entrySource" in ('manual', 'timer')
      union all
      select 'import', e.id, e.platform, e."earnedDate", null::timestamp,
        e."grossEarnings", e.tips, e.bonuses, null::numeric, e."totalMiles", e."importBatchId"
      from imported_earnings e inner join earnings_import_batches b on e."importBatchId" = b.id
      where e."userId" = ${userId} and b."userId" = ${userId} and b.status = 'committed'
    ), filtered as (
      select * from owned where ${range} and ${source} and ${query}
    ), page as (
      select * from filtered order by started desc, kind asc, id desc limit ${input.limit} offset ${input.offset}
    )
    select
      coalesce((select jsonb_agg(jsonb_build_object(
        'kind', kind, 'id', id, 'source', source,
        'startedAt', to_char(started, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'endedAt', case when ended is null then null else to_char(ended, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end,
        'base', base::text, 'tips', tips::text, 'bonuses', bonuses::text,
        'earningsUSD', (base + tips + bonuses)::text, 'hours', hours::text,
        'miles', miles::text, 'importBatchId', batch
      ) order by started desc, kind asc, id desc) from page), '[]'::jsonb) as entries,
      (select count(*)::text from filtered) as "totalEntries",
      (select coalesce(sum(base + tips + bonuses), 0)::text from filtered) as "totalEarningsUSD",
      (select coalesce(sum(hours), 0)::text from filtered) as "totalRecordedHours",
      (select count(*) filter (where hours is null)::text from filtered) as "unknownHoursCount",
      (select coalesce(sum(miles), 0)::text from filtered) as "totalRecordedMiles",
      (select count(*) filter (where miles is null)::text from filtered) as "unknownMilesCount",
      coalesce((select jsonb_agg(source order by source) from (select distinct source from owned) sources), '[]'::jsonb) as sources
  `;
}
export async function load(userId: number, input: HistoryInput) {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Work history needs a configured database.",
    });
  const result = await db.execute(historyQuery(userId, input));
  return result.rows[0];
}
