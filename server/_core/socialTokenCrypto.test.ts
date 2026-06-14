import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  encryptToken,
  decryptToken,
  CURRENT_CIPHER_VERSION,
} from "./socialTokenCrypto";

const TEST_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("socialTokenCrypto", () => {
  let origKey: string | undefined;
  beforeEach(() => {
    origKey = process.env.SOCIAL_TOKEN_ENC_KEY;
    process.env.SOCIAL_TOKEN_ENC_KEY = TEST_KEY;
  });
  afterEach(() => {
    process.env.SOCIAL_TOKEN_ENC_KEY = origKey;
  });

  it("round-trips a typical platform token", () => {
    const plain = "oauth-" + "a".repeat(40);
    const { ciphertext, version } = encryptToken(plain);
    expect(version).toBe(CURRENT_CIPHER_VERSION);
    expect(ciphertext).not.toContain(plain);
    expect(decryptToken(ciphertext)).toBe(plain);
  });

  it("produces a fresh IV per call", () => {
    const plain = "app-password-xxxxxxxxxxxxxxxx";
    expect(encryptToken(plain).ciphertext).not.toBe(
      encryptToken(plain).ciphertext
    );
  });

  it("rejects tampered ciphertext (auth tag failure)", () => {
    const { ciphertext } = encryptToken("refresh-zzzzzzzzzzzzzzzzzzzz");
    // Flip a byte inside the auth-tag region (offset 12..28) to reliably break
    // GCM verification.
    const buf = Buffer.from(ciphertext, "base64");
    buf[14] = buf[14] ^ 0xff;
    expect(() => decryptToken(buf.toString("base64"))).toThrow();
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
    process.env.SOCIAL_TOKEN_ENC_KEY = "tooshort";
    expect(() => encryptToken("hello")).toThrow(/≥32 chars/);
  });
});
