/**
 * One-shot: encrypt pre-existing plaintext shopify_stores.accessToken values.
 * Idempotent. Run after migration 0003.
 *   pnpm tsx scripts/migrate-shopify-tokens.mts
 */
import { isNotNull, eq } from "drizzle-orm";
import { getDb } from "../server/db";
import { shopifyStores } from "../drizzle/schema";
import { encryptToken } from "../server/_core/shopifyTokenCrypto";

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const rows = await db
    .select({
      id: shopifyStores.id,
      accessToken: shopifyStores.accessToken,
      accessTokenEnc: shopifyStores.accessTokenEnc,
      shopDomain: shopifyStores.shopDomain,
    })
    .from(shopifyStores)
    .where(isNotNull(shopifyStores.accessToken));

  let migrated = 0,
    skipped = 0;
  for (const row of rows) {
    if (row.accessTokenEnc || !row.accessToken) {
      skipped++;
      continue;
    }
    const enc = encryptToken(row.accessToken);
    await db
      .update(shopifyStores)
      .set({
        accessTokenEnc: enc.ciphertext,
        tokenCipherVersion: enc.version,
        accessToken: null,
      })
      .where(eq(shopifyStores.id, row.id));
    migrated++;
    console.log(`✓ encrypted ${row.shopDomain}`);
  }
  console.log(`\nDone. migrated=${migrated} skipped=${skipped}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
