import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  redactAccount,
  encryptConnectionTokens,
  decryptConnectionTokens,
} from "./socialAccountStore";
import type { SocialAccount } from "../../drizzle/schema";

const TEST_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

const baseAccount = (over: Partial<SocialAccount> = {}): SocialAccount =>
  ({
    id: 1,
    tenantId: 7,
    platform: "linkedin",
    handle: "@acme",
    accessToken: "ENC_ACCESS",
    refreshToken: "ENC_REFRESH",
    tokenExpiresAt: null,
    profileImageUrl: null,
    followerCount: 0,
    isConnected: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }) as SocialAccount;

describe("redactAccount", () => {
  it("strips access and refresh tokens but keeps safe fields", () => {
    const pub = redactAccount(baseAccount());
    expect("accessToken" in pub).toBe(false);
    expect("refreshToken" in pub).toBe(false);
    expect(pub).toMatchObject({
      id: 1,
      tenantId: 7,
      platform: "linkedin",
      handle: "@acme",
      isConnected: true,
    });
  });

  it("never leaks token values via JSON serialization", () => {
    const json = JSON.stringify(
      redactAccount(baseAccount({ accessToken: "supersecret-token" }))
    );
    expect(json).not.toContain("supersecret-token");
  });
});

describe("connection token encryption", () => {
  let orig: string | undefined;
  beforeEach(() => {
    orig = process.env.SOCIAL_TOKEN_ENC_KEY;
    process.env.SOCIAL_TOKEN_ENC_KEY = TEST_KEY;
  });
  afterEach(() => {
    process.env.SOCIAL_TOKEN_ENC_KEY = orig;
  });

  it("round-trips access + refresh tokens through encrypt/decrypt", () => {
    const enc = encryptConnectionTokens({
      accessToken: "access-123",
      refreshToken: "refresh-456",
    });
    expect(enc.accessToken).not.toContain("access-123");
    expect(enc.refreshToken).not.toContain("refresh-456");

    const dec = decryptConnectionTokens(
      baseAccount({
        accessToken: enc.accessToken,
        refreshToken: enc.refreshToken,
      })
    );
    expect(dec).toEqual({
      accessToken: "access-123",
      refreshToken: "refresh-456",
    });
  });

  it("handles a missing refresh token", () => {
    const enc = encryptConnectionTokens({
      accessToken: "access-only",
      refreshToken: null,
    });
    expect(enc.refreshToken).toBeNull();

    const dec = decryptConnectionTokens(
      baseAccount({ accessToken: enc.accessToken, refreshToken: null })
    );
    expect(dec.accessToken).toBe("access-only");
    expect(dec.refreshToken).toBeNull();
  });
});
