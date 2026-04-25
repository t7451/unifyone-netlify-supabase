import type { Config } from "@netlify/functions";
import {
  connectNeon,
  logger,
  publishSyndication,
  selectCandidates,
  syndication,
} from "@1commerce/spire";

// Every 6 hours. Selects new candidates per site, then drives every
// queued API-method syndication through publishOne(). Browser-method
// rows stay queued; the Contabo spire-worker picks those up the same
// way it picks up form-method directory submissions.
export const config: Config = {
  schedule: "0 */6 * * *",
};

export default async () => {
  const neonUrl = process.env.NEON_DATABASE_URL;
  if (!neonUrl) {
    return new Response(JSON.stringify({ ok: false, error: "NEON_DATABASE_URL not set" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const { sql: raw, db } = connectNeon(neonUrl);
  let queued = 0;
  let published = 0;
  let failed = 0;

  try {
    const selectResult = await selectCandidates({ db });
    queued = selectResult.queued;

    const apiQueued = await syndication.findQueuedForApiMethods(db);
    for (const row of apiQueued) {
      try {
        const result = await publishSyndication({ db, syndicationId: row.syndicationId });
        if (result.status === "published") published += 1;
        else if (result.status === "failed") failed += 1;
      } catch (err) {
        failed += 1;
        logger.error(
          {
            syndicationId: row.syndicationId,
            err: err instanceof Error ? err.message : String(err),
          },
          "publishOne crashed"
        );
      }
    }
  } finally {
    await raw.end({ timeout: 5 });
  }

  logger.info({ queued, published, failed }, "Syndicate tick complete");
  return new Response(JSON.stringify({ ok: true, queued, published, failed }), {
    headers: { "content-type": "application/json" },
  });
};
