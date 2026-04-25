import type { Config } from "@netlify/functions";
import { eq, sql as drizzleSql } from "drizzle-orm";
import {
  connectNeon,
  createGscClient,
  ingestGsc,
  logger,
  schema,
} from "@1commerce/spire";

// Daily 07:00 UTC — well after GSC's 24h finalization window for the
// previous day. Pulls 3 days of overlap so any late-arriving data lands
// in the right buckets.
export const config: Config = {
  schedule: "0 7 * * *",
};

export default async () => {
  const neonUrl = process.env.NEON_DATABASE_URL;
  if (!neonUrl) {
    return new Response(JSON.stringify({ ok: false, error: "NEON_DATABASE_URL not set" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
  const gscJson = process.env.GSC_SERVICE_ACCOUNT_JSON;
  if (!gscJson) {
    return new Response(
      JSON.stringify({ ok: false, error: "GSC_SERVICE_ACCOUNT_JSON not set" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }

  const { sql: raw, db } = connectNeon(neonUrl);
  const gsc = createGscClient({ serviceAccountJsonBase64: gscJson });
  const summaries: Array<{ siteSlug: string; rowsUpserted: number }> = [];

  try {
    const sites = await db.select().from(schema.sites).where(eq(schema.sites.active, true));
    for (const site of sites) {
      // Advisory lock per (site, 'gsc') so two concurrent runs against the
      // same site can't double-write. Hash collision is fine; only matters
      // within this one cron.
      const lockKey = hash32(`${site.id}:gsc`);
      try {
        await db.transaction(async (tx) => {
          await tx.execute(drizzleSql`select pg_advisory_xact_lock(${lockKey})`);
          const result = await ingestGsc({ db: tx as never, gsc, siteId: site.id, days: 3 });
          summaries.push({ siteSlug: site.slug, rowsUpserted: result.rowsUpserted });
        });
      } catch (err) {
        logger.error(
          {
            siteSlug: site.slug,
            err: err instanceof Error ? err.message : String(err),
          },
          "GSC ingest failed for site"
        );
      }
    }
  } finally {
    await raw.end({ timeout: 5 });
  }

  logger.info({ summaries }, "GSC daily ingest complete");
  return new Response(JSON.stringify({ ok: true, summaries }), {
    headers: { "content-type": "application/json" },
  });
};

function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h | 0;
}
