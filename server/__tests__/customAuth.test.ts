/**
 * Tests for pure functions in server/_core/customAuth.ts
 *
 * Mocks:
 *  - @neondatabase/serverless  → neon returns a plain object
 *  - drizzle-orm/neon-http     → drizzle returns mockDb (built with vi.fn chains)
 *  - ./_core/sdk               → sdk.createSessionToken resolves "mock-session-token"
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── mockDb setup ─────────────────────────────────────────────────────────────
// The select/insert/update chains need to be set up BEFORE vi.mock() factories
// run, which is why we define them as module-level consts that the factory
// captures by reference.

// Shared mutable result that tests can overwrite per-scenario
const _dbState = {
  selectResult: [] as unknown[],
  insertOk: true,
  updateOk: true,
};

// Chain builders — each returns the next link in the fluent chain
const mockLimit = vi.fn(() => Promise.resolve(_dbState.selectResult));
const mockWhere = vi.fn(() => ({ limit: mockLimit }));
const mockFrom = vi.fn(() => ({ where: mockWhere }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));

const mockInsertValues = vi.fn(() => Promise.resolve());
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

// update chain: .update().set().where()
const mockUpdateWhere = vi.fn(() => Promise.resolve());
const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }));

const mockDb = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
};

// ── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("@neondatabase/serverless", () => ({ neon: vi.fn(() => ({})) }));
vi.mock("drizzle-orm/neon-http", () => ({
  drizzle: vi.fn(() => mockDb),
}));
vi.mock("../_core/sdk", () => ({
  sdk: {
    createSessionToken: vi.fn().mockResolvedValue("mock-session-token"),
  },
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import {
  hashPassword,
  verifyPassword,
  signUp,
  signIn,
  buildSessionCookie,
  buildLogoutCookie,
} from "../_core/customAuth";

// ── Helpers ───────────────────────────────────────────────────────────────────

function resetDbState() {
  _dbState.selectResult = [];
  _dbState.insertOk = true;
  _dbState.updateOk = true;

  // Re-wire mock implementations to pick up fresh _dbState values
  mockLimit.mockImplementation(() => Promise.resolve(_dbState.selectResult));
  mockInsertValues.mockImplementation(() => Promise.resolve());
  mockUpdateWhere.mockImplementation(() => Promise.resolve());
}

// Set DATABASE_URL so getDb() proceeds
beforeEach(() => {
  process.env.DATABASE_URL = "postgresql://mock";
  resetDbState();
  vi.clearAllMocks();
  // Re-wire after clearAllMocks wipes mockImplementation
  mockLimit.mockImplementation(() => Promise.resolve(_dbState.selectResult));
  mockWhere.mockImplementation(() => ({ limit: mockLimit }));
  mockFrom.mockImplementation(() => ({ where: mockWhere }));
  mockSelect.mockImplementation(() => ({ from: mockFrom }));
  mockInsertValues.mockImplementation(() => Promise.resolve());
  mockInsert.mockImplementation(() => ({ values: mockInsertValues }));
  mockUpdateWhere.mockImplementation(() => Promise.resolve());
  mockUpdateSet.mockImplementation(() => ({ where: mockUpdateWhere }));
  mockUpdate.mockImplementation(() => ({ set: mockUpdateSet }));
});

// ═════════════════════════════════════════════════════════════════════════════
// 1. hashPassword / verifyPassword
// ═════════════════════════════════════════════════════════════════════════════

describe("hashPassword", () => {
  it("returns a string in salt$key hex format", async () => {
    const hash = await hashPassword("mypassword");
    expect(typeof hash).toBe("string");
    const parts = hash.split("$");
    expect(parts).toHaveLength(2);
    const [salt, key] = parts;
    // salt = 32 bytes hex → 64 chars; key = 64 bytes hex → 128 chars
    expect(salt).toMatch(/^[0-9a-f]{64}$/);
    expect(key).toMatch(/^[0-9a-f]{128}$/);
  });
});

describe("verifyPassword", () => {
  it("returns true for the correct password", async () => {
    const hash = await hashPassword("correct-horse");
    expect(await verifyPassword("correct-horse", hash)).toBe(true);
  });

  it("returns false for a wrong password", async () => {
    const hash = await hashPassword("correct-horse");
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("returns false for a malformed hash (no $ separator)", async () => {
    expect(await verifyPassword("any-password", "nodollarsignhere")).toBe(
      false
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. signUp
// ═════════════════════════════════════════════════════════════════════════════

describe("signUp", () => {
  it("returns { success: false, error } when email is missing", async () => {
    const result = await signUp("", "password123");
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("returns { success: false, error } when password is missing", async () => {
    const result = await signUp("user@example.com", "");
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("returns { success: false, error } when password is too short (< 8 chars)", async () => {
    const result = await signUp("user@example.com", "short");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/8/);
  });

  it("returns { success: false, error } when email format is invalid", async () => {
    const result = await signUp("not-an-email", "password123");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/email/i);
  });

  it("returns { success: false } when email already exists", async () => {
    // Mock DB returns an existing user
    _dbState.selectResult = [
      {
        openId: "existing-user",
        email: "taken@example.com",
        passwordHash: "salt$key",
        emailVerified: true,
      },
    ];
    const result = await signUp("taken@example.com", "password123");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/already exists/i);
  });

  it("returns { success: true, sessionToken, user } on happy path", async () => {
    // DB returns empty for existing-check
    _dbState.selectResult = [];
    const result = await signUp(
      "new@example.com",
      "securepass",
      "New User",
      "new-user"
    );
    expect(result.success).toBe(true);
    expect(result.sessionToken).toBe("mock-session-token");
    expect(result.user).toMatchObject({
      email: "new@example.com",
      name: "New User",
      username: "new-user",
    });
    expect(typeof result.user?.openId).toBe("string");
  });

  it("returns { success: false } when username format is invalid", async () => {
    _dbState.selectResult = [];
    const result = await signUp(
      "new@example.com",
      "securepass",
      "New User",
      "Bad Name!"
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/username/i);
  });

  it("auto-verifies email when RESEND_API_KEY is NOT set and NODE_ENV is NOT production", async () => {
    delete process.env.RESEND_API_KEY;
    process.env.NODE_ENV = "development";
    _dbState.selectResult = [];
    const result = await signUp("new@example.com", "securepass", "New User");
    expect(result.success).toBe(true);
    expect(result.user?.emailVerified).toBe(true);
  });

  it("does NOT auto-verify email when RESEND_API_KEY is set", async () => {
    process.env.RESEND_API_KEY = "re_mock_key";
    _dbState.selectResult = [];
    const result = await signUp("new@example.com", "securepass", "New User");
    expect(result.success).toBe(true);
    expect(result.user?.emailVerified).toBe(false);
    delete process.env.RESEND_API_KEY;
  });

  it("auto-verifies email when RESEND_API_KEY is not set, regardless of NODE_ENV", async () => {
    delete process.env.RESEND_API_KEY;
    process.env.NODE_ENV = "production";
    _dbState.selectResult = [];
    const result = await signUp("new@example.com", "securepass", "New User");
    expect(result.success).toBe(true);
    expect(result.user?.emailVerified).toBe(true);
    delete process.env.NODE_ENV;
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. signIn
// ═════════════════════════════════════════════════════════════════════════════

describe("signIn", () => {
  it("returns { success: false } when email is missing", async () => {
    const result = await signIn("", "password123");
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("returns { success: false } when password is missing", async () => {
    const result = await signIn("user@example.com", "");
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("returns { success: false } when user not found (timing-safe path)", async () => {
    _dbState.selectResult = [];
    const result = await signIn("nobody@example.com", "password123");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid/i);
  });

  it("returns { success: false } when user has no passwordHash (social login)", async () => {
    _dbState.selectResult = [
      {
        openId: "social-user",
        email: "social@example.com",
        passwordHash: null,
        emailVerified: true,
        name: "Social User",
      },
    ];
    const result = await signIn("social@example.com", "anypassword");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/different sign-in method/i);
  });

  it("returns { success: false } when password is wrong", async () => {
    // Create a real hash so verifyPassword runs correctly
    const realHash = await hashPassword("correct-password");
    _dbState.selectResult = [
      {
        openId: "real-user",
        email: "user@example.com",
        passwordHash: realHash,
        emailVerified: true,
        name: "Real User",
      },
    ];
    const result = await signIn("user@example.com", "wrong-password");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid/i);
  });

  it("returns { success: false, code: 'email_not_verified' } when emailVerified === false and RESEND_API_KEY is set", async () => {
    // Set RESEND_API_KEY to enable verification enforcement
    process.env.RESEND_API_KEY = "re_mock_key";
    const realHash = await hashPassword("mypassword");
    _dbState.selectResult = [
      {
        openId: "unverified-user",
        email: "unverified@example.com",
        passwordHash: realHash,
        emailVerified: false,
        name: "Unverified",
      },
    ];
    const result = await signIn("unverified@example.com", "mypassword");
    expect(result.success).toBe(false);
    expect(result.code).toBe("email_not_verified");
    delete process.env.RESEND_API_KEY;
  });

  it("allows unverified users to sign in when RESEND_API_KEY is NOT set and NODE_ENV is NOT production", async () => {
    // Ensure we're not in production and no email service
    delete process.env.RESEND_API_KEY;
    process.env.NODE_ENV = "development";
    const realHash = await hashPassword("mypassword");
    _dbState.selectResult = [
      {
        openId: "unverified-user",
        email: "unverified@example.com",
        passwordHash: realHash,
        emailVerified: false,
        name: "Unverified",
      },
    ];
    const result = await signIn("unverified@example.com", "mypassword");
    expect(result.success).toBe(true);
    expect(result.sessionToken).toBe("mock-session-token");
  });

  it("allows sign-in for emailVerified === false when RESEND_API_KEY is not set, regardless of NODE_ENV", async () => {
    // Without an email service we cannot deliver verification links, so the
    // gate must not enforce — even in production. Otherwise users get locked
    // out on second sign-in.
    delete process.env.RESEND_API_KEY;
    process.env.NODE_ENV = "production";
    const realHash = await hashPassword("mypassword");
    _dbState.selectResult = [
      {
        openId: "unverified-user",
        email: "unverified@example.com",
        passwordHash: realHash,
        emailVerified: false,
        name: "Unverified",
      },
    ];
    const result = await signIn("unverified@example.com", "mypassword");
    expect(result.success).toBe(true);
    expect(result.sessionToken).toBe("mock-session-token");
    delete process.env.NODE_ENV;
  });

  it("returns { success: true, sessionToken, user } on happy path", async () => {
    const realHash = await hashPassword("goodpassword");
    _dbState.selectResult = [
      {
        openId: "verified-user",
        email: "verified@example.com",
        username: "verified-user",
        passwordHash: realHash,
        emailVerified: true,
        name: "Verified User",
      },
    ];
    const result = await signIn("verified@example.com", "goodpassword");
    expect(result.success).toBe(true);
    expect(result.sessionToken).toBe("mock-session-token");
    expect(result.user).toMatchObject({
      openId: "verified-user",
      email: "verified@example.com",
      name: "Verified User",
      username: "verified-user",
    });
  });

  it("allows users to sign in with a username", async () => {
    const realHash = await hashPassword("goodpassword");
    _dbState.selectResult = [
      {
        openId: "verified-user",
        email: "verified@example.com",
        username: "verified-user",
        passwordHash: realHash,
        emailVerified: true,
        name: "Verified User",
      },
    ];
    const result = await signIn("verified-user", "goodpassword");
    expect(result.success).toBe(true);
    expect(result.user).toMatchObject({
      email: "verified@example.com",
      username: "verified-user",
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. buildSessionCookie / buildLogoutCookie
// ═════════════════════════════════════════════════════════════════════════════

describe("buildSessionCookie", () => {
  it("contains the token, HttpOnly, SameSite=Lax, Path=/", () => {
    const cookie = buildSessionCookie("my-token", false);
    expect(cookie).toContain("my-token");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
  });

  it("includes the Secure flag when secure=true", () => {
    const cookie = buildSessionCookie("my-token", true);
    expect(cookie).toContain("Secure");
  });

  it("does NOT include Secure flag when secure=false", () => {
    const cookie = buildSessionCookie("my-token", false);
    expect(cookie).not.toContain("Secure");
  });

  it("includes Domain= when domain is provided", () => {
    const cookie = buildSessionCookie("my-token", false, "example.com");
    expect(cookie).toContain("Domain=example.com");
  });
});

describe("buildLogoutCookie", () => {
  it("has Max-Age=0", () => {
    const cookie = buildLogoutCookie(false);
    expect(cookie).toContain("Max-Age=0");
  });

  it("contains HttpOnly, SameSite=Lax, Path=/", () => {
    const cookie = buildLogoutCookie(false);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
  });

  it("includes Secure flag when secure=true", () => {
    const cookie = buildLogoutCookie(true);
    expect(cookie).toContain("Secure");
  });

  it("includes Domain= when domain is provided", () => {
    const cookie = buildLogoutCookie(false, "example.com");
    expect(cookie).toContain("Domain=example.com");
  });
});
