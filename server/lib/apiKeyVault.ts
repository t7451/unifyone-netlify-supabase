/**
 * server/lib/apiKeyVault.ts
 *
 * AES-256-GCM encryption for user-supplied provider API keys (BYOK).
 * The data key is derived from JWT_SECRET, so rotating JWT_SECRET
 * invalidates stored keys (users simply re-enter them in Settings).
 */
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { ENV } from "../_core/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function deriveDataKey(): Buffer {
  if (!ENV.cookieSecret) {
    throw new Error("JWT_SECRET must be configured to store API keys");
  }
  return createHash("sha256")
    .update(`${ENV.cookieSecret}:api-key-vault:v1`)
    .digest();
}

/** Returns "v1:<iv>:<authTag>:<ciphertext>" (all base64). */
export function encryptApiKey(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, deriveDataKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decryptApiKey(encrypted: string): string {
  const [version, ivB64, tagB64, dataB64] = encrypted.split(":");
  if (version !== "v1" || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("Unrecognized encrypted API key format");
  }
  const decipher = createDecipheriv(
    ALGORITHM,
    deriveDataKey(),
    Buffer.from(ivB64, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
