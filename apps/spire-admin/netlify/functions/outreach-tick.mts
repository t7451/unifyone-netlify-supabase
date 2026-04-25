import type { Config } from "@netlify/functions";
import {
  advanceSequences,
  connectNeon,
  createAnthropic,
  logger,
} from "@1commerce/spire";

// Every 30 minutes. Drafts step 1 / step 2 for sequences whose previous step
// is sent, and promotes scheduled+due messages to ready_to_send (the
// spire-worker sender loop on Contabo actually sends them).
//
// Why 30 min: scheduling is eventually consistent and a 30-min lag between
// step-1 → step-2 readiness is invisible. The cap-enforcement check in the
// gate naturally smooths bursts.

export const config: Config = {
  schedule: "*/30 * * * *",
};

export default async () => {
  const neonUrl = process.env.NEON_DATABASE_URL;
  if (!neonUrl) {
    return new Response(
      JSON.stringify({ ok: false, error: "NEON_DATABASE_URL not set" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return new Response(
      JSON.stringify({ ok: false, error: "ANTHROPIC_API_KEY not set" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }

  const { sql: raw, db } = connectNeon(neonUrl);
  const anthropic = createAnthropic(anthropicKey);
  const model = process.env.SPIRE_MODEL ?? "claude-opus-4-7";

  try {
    const out = await advanceSequences({ db, anthropic, model, limit: 50 });
    logger.info(out, "outreach tick complete");
    return new Response(JSON.stringify({ ok: true, ...out }), {
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      "outreach tick failed"
    );
    return new Response(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  } finally {
    await raw.end({ timeout: 5 });
  }
};
