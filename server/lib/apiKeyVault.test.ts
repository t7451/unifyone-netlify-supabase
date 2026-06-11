import { describe, expect, it, vi } from "vitest";

vi.mock("../_core/env", () => ({
  ENV: { cookieSecret: "test-jwt-secret-at-least-32-chars-long" },
}));

import { decryptApiKey, encryptApiKey } from "./apiKeyVault";

describe("apiKeyVault", () => {
  it("round-trips an API key", () => {
    const key = "sk-or-v1-abcdef0123456789";
    const encrypted = encryptApiKey(key);
    expect(encrypted).not.toContain(key);
    expect(encrypted.startsWith("v1:")).toBe(true);
    expect(decryptApiKey(encrypted)).toBe(key);
  });

  it("produces unique ciphertexts per call (random IV)", () => {
    const key = "sk-or-v1-abcdef0123456789";
    expect(encryptApiKey(key)).not.toBe(encryptApiKey(key));
  });

  it("rejects tampered ciphertext", () => {
    const encrypted = encryptApiKey("sk-or-v1-abcdef0123456789");
    const parts = encrypted.split(":");
    parts[3] = Buffer.from("tampered-data").toString("base64");
    expect(() => decryptApiKey(parts.join(":"))).toThrow();
  });
});
