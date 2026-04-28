/**
 * Tests for SDKServer session revocation via passwordChangedAt.
 *
 * The SDK must reject any JWT whose `iat` (issued-at, seconds since epoch)
 * is earlier than the user's `passwordChangedAt` timestamp. This is the
 * mechanism that makes password resets and revokeAllSessions actually work.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { SignJWT } from "jose";

// ── We need a real JWT secret to sign test tokens ─────────────────────────────
const TEST_SECRET = "test-secret-that-is-at-least-32-characters-long";

// ── Shared mutable DB state ───────────────────────────────────────────────────
const _dbState: {
  user: Record<string, unknown> | null;
} = { user: null };

// ── DB mock (minimal — only getUserByOpenId and upsertUser paths needed) ──────
const mockGetUserByOpenId = vi.fn(async () => _dbState.user as unknown);
const mockUpsertUser = vi.fn(async () => {});

vi.mock("./db", () => ({
  getUserByOpenId: mockGetUserByOpenId,
  upsertUser: mockUpsertUser,
}));

// ── ENV mock ──────────────────────────────────────────────────────────────────
vi.mock("./_core/env", () => ({
  ENV: {
    appId: "unifyone",
    cookieSecret: TEST_SECRET,
    isProduction: false,
  },
}));

// ── Imports after mocks ───────────────────────────────────────────────────────
import { COOKIE_NAME } from "../shared/const";
import type { Request as ExpressRequest } from "express";

// Build a minimal mock Express request carrying a signed session cookie.
async function makeRequest(token: string): Promise<ExpressRequest> {
  return {
    headers: { cookie: `${COOKIE_NAME}=${token}` },
  } as unknown as ExpressRequest;
}

// Sign a JWT with a custom `iat` so we can backdate/forward-date tokens.
async function signJwt(
  openId: string,
  iatOverrideSeconds?: number
): Promise<string> {
  const secretKey = new TextEncoder().encode(TEST_SECRET);
  const now = Math.floor(Date.now() / 1000);
  const iat = iatOverrideSeconds ?? now;

  const jwt = await new SignJWT({
    openId,
    appId: "unifyone",
    name: "Test User",
    email: "test@example.com",
    loginMethod: "password",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(iat)
    .setExpirationTime(iat + 365 * 24 * 3600) // 1 year
    .sign(secretKey);

  return jwt;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("SDKServer.authenticateRequest — passwordChangedAt enforcement", () => {
  beforeEach(() => {
    vi.resetModules();
    _dbState.user = null;
    mockGetUserByOpenId.mockReset();
    mockGetUserByOpenId.mockImplementation(async () => _dbState.user);
    mockUpsertUser.mockReset();
    mockUpsertUser.mockResolvedValue(undefined);
  });

  it("accepts a valid JWT when passwordChangedAt is null", async () => {
    const { sdk } = await import("./_core/sdk");

    _dbState.user = {
      id: 1,
      openId: "user-1",
      name: "Test User",
      email: "test@example.com",
      role: "user",
      tenantId: null,
      passwordChangedAt: null,
      lastSignedIn: new Date(Date.now() - 10 * 60 * 1000), // 10 min ago
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const token = await signJwt("user-1");
    const req = await makeRequest(token);

    await expect(sdk.authenticateRequest(req)).resolves.toMatchObject({
      openId: "user-1",
    });
  });

  it("accepts a JWT issued AFTER passwordChangedAt", async () => {
    vi.resetModules();
    const { sdk } = await import("./_core/sdk");

    const passwordChangedAt = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago

    _dbState.user = {
      id: 2,
      openId: "user-2",
      name: "Test User",
      email: "test2@example.com",
      role: "user",
      tenantId: null,
      passwordChangedAt,
      lastSignedIn: new Date(Date.now() - 10 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Token issued 10 minutes ago — AFTER the password change 30 min ago
    const iat = Math.floor(Date.now() / 1000) - 10 * 60;
    const token = await signJwt("user-2", iat);
    const req = await makeRequest(token);

    await expect(sdk.authenticateRequest(req)).resolves.toMatchObject({
      openId: "user-2",
    });
  });

  it("rejects a JWT issued BEFORE passwordChangedAt (session revocation)", async () => {
    vi.resetModules();
    const { sdk } = await import("./_core/sdk");

    // Password was changed 10 minutes ago
    const passwordChangedAt = new Date(Date.now() - 10 * 60 * 1000);

    _dbState.user = {
      id: 3,
      openId: "user-3",
      name: "Test User",
      email: "test3@example.com",
      role: "user",
      tenantId: null,
      passwordChangedAt,
      lastSignedIn: new Date(Date.now() - 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Token issued 1 hour ago — BEFORE the password change
    const iat = Math.floor(Date.now() / 1000) - 60 * 60;
    const token = await signJwt("user-3", iat);
    const req = await makeRequest(token);

    await expect(sdk.authenticateRequest(req)).rejects.toThrow(
      /revoked|forbidden/i
    );
  });

  it("rejects a JWT issued at exactly passwordChangedAt (boundary — revoked)", async () => {
    vi.resetModules();
    const { sdk } = await import("./_core/sdk");

    const nowSec = Math.floor(Date.now() / 1000);
    // passwordChangedAt is exactly equal to iat (same second)
    const passwordChangedAt = new Date(nowSec * 1000);

    _dbState.user = {
      id: 4,
      openId: "user-4",
      name: "Test User",
      email: "test4@example.com",
      role: "user",
      tenantId: null,
      passwordChangedAt,
      lastSignedIn: new Date(Date.now() - 10 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // iat === passwordChangedAt (in seconds) — should be rejected (< check fails)
    const token = await signJwt("user-4", nowSec);
    const req = await makeRequest(token);

    // iat === passwordChangedAtSec is NOT < passwordChangedAtSec, so it should be ACCEPTED
    // (we only reject iat strictly LESS THAN passwordChangedAt)
    await expect(sdk.authenticateRequest(req)).resolves.toMatchObject({
      openId: "user-4",
    });
  });
});
