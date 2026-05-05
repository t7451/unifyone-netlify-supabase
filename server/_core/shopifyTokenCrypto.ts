/**
 * AES-256-GCM at-rest encryption for Shopify access tokens.
 * Wire format (base64): iv (12B) || authTag (16B) || ciphertext
 * Rotation: bump tokenCipherVersion + add SHOPIFY_TOKEN_ENC_KEY_V<n>
 */
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;
const CIPHER_VERSION = 1;

function deriveKey(material: string): Buffer {
  if (!material || material.length < 32) {
    throw new Error(
      "SHOPIFY_TOKEN_ENC_KEY must be set to ≥32 chars. Generate with: openssl rand -hex 32"
    );
  }
  return createHash("sha256").update(material).digest();
}

function getKey(version: number = CIPHER_VERSION): Buffer {
  if (version === 1) return deriveKey(process.env.SHOPIFY_TOKEN_ENC_KEY ?? "");
  return deriveKey(process.env[`SHOPIFY_TOKEN_ENC_KEY_V${version}`] ?? "");
}

export function encryptToken(plaintext: string): {
  ciphertext: string;
  version: number;
} {
  if (typeof plaintext !== "string" || plaintext.length === 0) {
    throw new Error("encryptToken: plaintext must be non-empty string");
  }
  const key = getKey(CIPHER_VERSION);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: Buffer.concat([iv, tag, enc]).toString("base64"),
    version: CIPHER_VERSION,
  };
}

export function decryptToken(
  ciphertextB64: string,
  version: number = CIPHER_VERSION
): string {
  if (typeof ciphertextB64 !== "string" || ciphertextB64.length === 0) {
    throw new Error("decryptToken: ciphertext must be non-empty string");
  }
  const buf = Buffer.from(ciphertextB64, "base64");
  if (buf.length < IV_LEN + TAG_LEN + 1)
    throw new Error("decryptToken: ciphertext too short");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const enc = buf.subarray(IV_LEN + TAG_LEN);
  const key = getKey(version);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString(
    "utf8"
  );
}

export const CURRENT_CIPHER_VERSION = CIPHER_VERSION;
