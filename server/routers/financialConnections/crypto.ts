import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export function encryptionReady() {
  return /^[a-f\d]{64}$/i.test(process.env.FINANCIAL_TOKEN_ENC_KEY ?? "");
}
function key() {
  if (!encryptionReady())
    throw new Error("Financial token encryption is not configured.");
  return Buffer.from(process.env.FINANCIAL_TOKEN_ENC_KEY!, "hex");
}
export function sealToken(token: string, owner: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(owner));
  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  return `v1.${Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64")}`;
}
export function openToken(value: string, owner: string) {
  if (!value.startsWith("v1."))
    throw new Error("Unsupported financial token version.");
  const data = Buffer.from(value.slice(3), "base64");
  if (data.length < 29) throw new Error("Invalid encrypted financial token.");
  const decipher = createDecipheriv("aes-256-gcm", key(), data.subarray(0, 12));
  decipher.setAAD(Buffer.from(owner));
  decipher.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([
    decipher.update(data.subarray(28)),
    decipher.final(),
  ]).toString("utf8");
}
