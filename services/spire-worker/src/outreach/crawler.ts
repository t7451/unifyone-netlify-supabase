import { crawlSiteSample } from "@1commerce/spire";
import { logger } from "../lib/logger.js";

// Monthly broken-link crawl driver. Designed to be invoked manually or via
// `pnpm --filter spire-worker exec tsx src/outreach/crawler-cli.ts <siteId>`,
// not as a continuous loop — we DO NOT want to re-hit prospects more than
// monthly. The scheduled-functions tier handles cadence.

type DbWithTx = {
  transaction: <T>(fn: (tx: unknown) => Promise<T>) => Promise<T>;
};
type RawSql = { end: (opts?: { timeout?: number }) => Promise<void> };

export async function runCrawl(
  connect: () => { sql: RawSql; db: DbWithTx },
  siteId: string,
  limit = 20
): Promise<{ scanned: number; broken: number; matched: number }> {
  const { sql: raw, db } = connect();
  let scanned = 0;
  let broken = 0;
  let matched = 0;
  try {
    const results = await crawlSiteSample({ db: db as never, siteId, limit });
    for (const r of results) {
      scanned += r.scanned;
      broken += r.broken;
      matched += r.matched;
    }
    logger.info(
      { siteId, prospects: results.length, scanned, broken, matched },
      "Outreach broken-link crawl complete"
    );
  } finally {
    await raw.end({ timeout: 5 });
  }
  return { scanned, broken, matched };
}
