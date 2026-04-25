import { eq } from "drizzle-orm";
import {
  connectNeon,
  createGscClient,
  findCannibalQueries,
  findDecliningPages,
  findRisingQueries,
  findStrikingDistanceQueries,
  ingestGsc,
  loadEnv,
  logger,
  schema,
  summarizeGsc,
} from "@1commerce/spire";

// `spire gsc ingest` and `spire gsc report <kind>`. Service-account auth
// reads from GSC_SERVICE_ACCOUNT_JSON (base64). All writes go through
// the spire library; this file is a thin CLI driver.

export async function gscIngestCommand(input: {
  siteSlug: string;
  days?: number;
}): Promise<void> {
  const env = loadEnv(["NEON_DATABASE_URL"] as const);
  const gscJson = process.env.GSC_SERVICE_ACCOUNT_JSON;
  if (!gscJson) {
    throw new Error(
      "GSC_SERVICE_ACCOUNT_JSON not set. Base64-encode the service-account JSON key and add to env."
    );
  }
  const { sql: raw, db } = connectNeon(env.NEON_DATABASE_URL);
  try {
    const [site] = await db
      .select()
      .from(schema.sites)
      .where(eq(schema.sites.slug, input.siteSlug))
      .limit(1);
    if (!site) throw new Error(`Site ${input.siteSlug} not registered`);

    const gsc = createGscClient({ serviceAccountJsonBase64: gscJson });
    const result = await ingestGsc({
      db,
      gsc,
      siteId: site.id,
      days: input.days,
    });
    logger.info(result, "GSC ingest complete");
  } finally {
    await raw.end({ timeout: 5 });
  }
}

export type GscReportKind =
  | "striking-distance"
  | "cannibals"
  | "rising"
  | "declining"
  | "summary";

export async function gscReportCommand(input: {
  kind: GscReportKind;
  siteSlug: string;
  weeks?: number;
}): Promise<void> {
  const env = loadEnv(["NEON_DATABASE_URL"] as const);
  const { sql: raw, db } = connectNeon(env.NEON_DATABASE_URL);
  try {
    const [site] = await db
      .select()
      .from(schema.sites)
      .where(eq(schema.sites.slug, input.siteSlug))
      .limit(1);
    if (!site) throw new Error(`Site ${input.siteSlug} not registered`);

    const weeks = input.weeks ?? 2;
    switch (input.kind) {
      case "striking-distance": {
        const rows = await findStrikingDistanceQueries(db, {
          siteId: site.id,
          weeks,
        });
        logger.info(
          { count: rows.length, rows: rows.slice(0, 25) },
          "Striking-distance queries"
        );
        return;
      }
      case "cannibals": {
        const rows = await findCannibalQueries(db, {
          siteId: site.id,
          weeks: 4,
        });
        logger.info({ count: rows.length, rows }, "Cannibal queries");
        return;
      }
      case "rising": {
        const rows = await findRisingQueries(db, { siteId: site.id, weeks });
        logger.info({ count: rows.length, rows }, "Rising queries");
        return;
      }
      case "declining": {
        const rows = await findDecliningPages(db, { siteId: site.id, weeks });
        logger.info({ count: rows.length, rows }, "Declining pages");
        return;
      }
      case "summary": {
        const summary = await summarizeGsc(db, { siteId: site.id });
        logger.info(summary, "GSC week-over-week summary");
        return;
      }
      default: {
        const exhaustive: never = input.kind;
        throw new Error(`Unknown gsc report kind: ${String(exhaustive)}`);
      }
    }
  } finally {
    await raw.end({ timeout: 5 });
  }
}
