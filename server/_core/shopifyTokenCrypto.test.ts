import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  encryptToken,
  decryptToken,
  CURRENT_CIPHER_VERSION,
} from "./shopifyTokenCrypto";

const TEST_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("shopifyTokenCrypto", () => {
  let origKey: string | undefined;
  beforeEach(() => {
    origKey = process.env.SHOPIFY_TOKEN_ENC_KEY;
    process.env.SHOPIFY_TOKEN_ENC_KEY = TEST_KEY;
  });
  afterEach(() => {
    process.env.SHOPIFY_TOKEN_ENC_KEY = origKey;
  });

  it("round-trips a typical Shopify access token", () => {
    const plain = "shpat_" + "a".repeat(32);
    const { ciphertext, version } = encryptToken(plain);
    expect(version).toBe(CURRENT_CIPHER_VERSION);
    expect(ciphertext).not.toContain(plain);
    expect(decryptToken(ciphertext)).toBe(plain);
  });

  it("produces a fresh IV per call", () => {
    const plain = "shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
    expect(encryptToken(plain).ciphertext).not.toBe(
      encryptToken(plain).ciphertext
    );
  });

  it("rejects tampered ciphertext (auth tag failure)", () => {
    const { ciphertext } = encryptToken(
      "shpat_zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz"
    );
    const tampered =
      ciphertext.slice(0, -2) +
      (ciphertext.slice(-2, -1) === "A" ? "B" : "A") +
      ciphertext.slice(-1);
    expect(() => decryptToken(tampered)).toThrow();
  });

  it("rejects ciphertext shorter than iv+tag", () => {
    expect(() => decryptToken(Buffer.from("abc").toString("base64"))).toThrow(
      /too short/
    );
  });

  it("rejects empty plaintext", () => {
    expect(() => encryptToken("")).toThrow();
  });

  it("requires a key of at least 32 chars", () => {
    process.env.SHOPIFY_TOKEN_ENC_KEY = "tooshort";
    expect(() => encryptToken("hello")).toThrow(/≥32 chars/);
  });
});
