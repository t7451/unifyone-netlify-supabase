/**
 * Server-only: fetch a store row + decrypted access token for outbound Admin API calls.
 * NEVER return the result of this to a client.
 * Falls back to legacy plaintext column for pre-encryption stores.
 */
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { shopifyStores } from "../../drizzle/schema";
import { decryptToken } from "./shopifyTokenCrypto";

export type ShopifyStoreToken = {
  id: number;
  shopDomain: string;
  accessToken: string;
  scopes: string;
  tenantId: number | null;
  userId: number;
};

export async function getStoreToken(
  storeId: number
): Promise<ShopifyStoreToken | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(shopifyStores)
    .where(eq(shopifyStores.id, storeId))
    .limit(1);
  if (!rows.length) return null;
  const row = rows[0];

  let plaintext: string | null = null;
  if (row.accessTokenEnc)
    plaintext = decryptToken(row.accessTokenEnc, row.tokenCipherVersion ?? 1);
  else if (row.accessToken) plaintext = row.accessToken;
  if (!plaintext) return null;

  return {
    id: row.id,
    shopDomain: row.shopDomain,
    accessToken: plaintext,
    scopes: row.scopes,
    tenantId: row.tenantId,
    userId: row.userId,
  };
}

export async function getStoreTokenByDomain(
  shopDomain: string
): Promise<ShopifyStoreToken | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(shopifyStores)
    .where(eq(shopifyStores.shopDomain, shopDomain))
    .limit(1);
  if (!rows.length) return null;
  return getStoreToken(rows[0].id);
}
