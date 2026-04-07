/**
 * aggregate-credit-stats-scheduled.mts
 *
 * Scheduled Function — runs every hour to pre-aggregate credit usage
 * statistics per tenant into the `credit_usage_hourly` Supabase table.
 *
 * Pre-computing prevents N+1 dashboard queries and removes live
 * aggregation load from the main server function on every page load.
 *
 * Schedule: every hour at :05 (gives other jobs time to flush first)
 * Timeout:  30 seconds
 *
 * Supabase table required (run migration if not exists):
 *   CREATE TABLE IF NOT EXISTS credit_usage_hourly (
 *     id          bigserial PRIMARY KEY,
 *     tenant_id   text NOT NULL,
 *     hour        timestamptz NOT NULL,
 *     total_spent numeric(12,4) NOT NULL DEFAULT 0,
 *     event_count integer NOT NULL DEFAULT 0,
 *     created_at  timestamptz DEFAULT now(),
 *     UNIQUE (tenant_id, hour)
 *   );
 */
import type { Config } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

export default async (req: Request) => {
  const { next_run } = await req.json().catch(() => ({ next_run: "unknown" }));
  console.log(`[aggregate-credit-stats] Hourly aggregation start. Next: ${next_run}`);

  const supabaseUrl = Netlify.env.get("SUPABASE_URL") || Netlify.env.get("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseKey = Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    console.error("[aggregate-credit-stats] Supabase env vars missing");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  try {
    // Aggregate the previous full hour of credit usage events
    const hourStart = new Date();
    hourStart.setMinutes(0, 0, 0);
    hourStart.setHours(hourStart.getHours() - 1);
    const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

    const { data: events, error } = await supabase
      .from("credit_usage_events")
      .select("tenant_id, amount")
      .gte("created_at", hourStart.toISOString())
      .lt("created_at", hourEnd.toISOString());

    if (error) {
      console.error("[aggregate-credit-stats] Query error:", error.message);
      return;
    }

    if (!events || events.length === 0) {
      console.log("[aggregate-credit-stats] No events in last hour — skipping");
      return;
    }

    // Group by tenant
    const byTenant: Record<string, { total: number; count: number }> = {};
    for (const e of events) {
      const tid = e.tenant_id ?? "global";
      if (!byTenant[tid]) byTenant[tid] = { total: 0, count: 0 };
      byTenant[tid].total += Number(e.amount ?? 0);
      byTenant[tid].count += 1;
    }

    // Upsert aggregates
    const rows = Object.entries(byTenant).map(([tenant_id, stats]) => ({
      tenant_id,
      hour: hourStart.toISOString(),
      total_spent: stats.total,
      event_count: stats.count,
    }));

    const { error: upsertError } = await supabase
      .from("credit_usage_hourly")
      .upsert(rows, { onConflict: "tenant_id,hour" });

    if (upsertError) {
      console.error("[aggregate-credit-stats] Upsert error:", upsertError.message);
    } else {
      console.log(`[aggregate-credit-stats] Aggregated ${events.length} events across ${rows.length} tenants`);
    }
  } catch (err) {
    console.error("[aggregate-credit-stats] Unexpected error:", err);
  }
};

export const config: Config = {
  schedule: "5 * * * *", // every hour at :05
};
