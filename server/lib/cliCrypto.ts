/**
 * server/lib/cliCrypto.ts
 *
 * Shared AES-256-GCM helpers for the in-website CLI.
 * Used by cli.ts (router) and cliWebSocket.ts (WS relay) to
 * encrypt/decrypt VPS SSH private keys before storing in the DB.
 *
 * Key material is derived from JWT_SECRET + a per-user salt so that
 * revoking a user's session also invalidates their stored keys.
 */

import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "crypto";
import { ENV } from "../_core/env";

const ALGORITHM = "aes-256-gcm";

/** Derive a 32-byte key from the app secret + a per-user salt. */
export function deriveCliKey(userId: number): Buffer {
  return createHmac("sha256", ENV.cookieSecret)
    .update(`cli-key-${userId}`)
    .digest();
}

/**
 * AES-256-GCM encrypt a private key string.
 * Returns `iv:authTag:ciphertext` (all hex-encoded).
 */
export function encryptCliKey(plaintext: string, userId: number): string {
  const key = deriveCliKey(userId);
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypt a previously encrypted private key string.
 * Throws if the format is invalid or the GCM auth tag does not match.
 */
export function decryptCliKey(encryptedStr: string, userId: number): string {
  const parts = encryptedStr.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted key format");
  const [ivHex, authTagHex, ciphertextHex] = parts;
  const key = deriveCliKey(userId);
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  return (
    decipher.update(Buffer.from(ciphertextHex, "hex")).toString("utf8") +
    decipher.final("utf8")
  );
}
