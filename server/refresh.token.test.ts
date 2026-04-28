/**
 * Tests for refresh token rotation in customAuth.ts
 *
 * Covers:
 *  - issueRefreshToken: stores a hash, returns a raw token
 *  - rotateRefreshToken: accepts valid token, rotates it, rejects replayed token
 *  - rotateRefreshToken: rejects revoked / expired tokens
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── DB state shared across chain mocks ───────────────────────────────────────

type StoredToken = {
  id: number;
  userId: number;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  ipAddress: string | null;
  userAgent: string | null;
  lastUsedAt: Date;
  createdAt: Date;
};

type StoredUser = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  username: string | null;
  loginMethod: string | null;
  deletedAt: Date | null;
};

const _state: {
  tokens: StoredToken[];
  users: StoredUser[];
  nextId: number;
  revokedIds: number[];
  deletedIds: number[];
} = {
  tokens: [],
  users: [],
  nextId: 1,
  revokedIds: [],
  deletedIds: [],
};

// ── Mock Drizzle DB ──────────────────────────────────────────────────────────

const mockDb = {
  insert: vi.fn((_table: unknown) => ({
    values: vi.fn(
      (vals: Omit<StoredToken, "id" | "lastUsedAt" | "createdAt">) => {
        const token: StoredToken = {
          id: _state.nextId++,
          lastUsedAt: new Date(),
          createdAt: new Date(),
          ...vals,
          revokedAt: vals.revokedAt ?? null,
          ipAddress: vals.ipAddress ?? null,
          userAgent: vals.userAgent ?? null,
        };
        _state.tokens.push(token);
        return Promise.resolve();
      }
    ),
  })),
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn((_condition: unknown) => ({
        limit: vi.fn((_n: number) => {
          // This simplified mock just returns the first item when called.
          // Tests configure _state.tokens / _state.users directly.
          return Promise.resolve(_state.tokens.slice(0, 1));
        }),
      })),
    })),
  })),
  update: vi.fn(() => ({
    set: vi.fn((vals: Record<string, unknown>) => ({
      where: vi.fn(() => {
        // Apply revocation to any token
        if (vals.revokedAt && _state.tokens[0]) {
          _state.tokens[0].revokedAt = vals.revokedAt as Date;
        }
        return Promise.resolve();
      }),
    })),
  })),
  delete: vi.fn(() => ({
    where: vi.fn(() => Promise.resolve()),
  })),
};

vi.mock("../db", () => ({
  getDb: vi.fn().mockResolvedValue(mockDb),
}));

vi.mock("./_core/sdk", () => ({
  sdk: {
    createSessionToken: vi.fn().mockResolvedValue("mock-access-token"),
  },
}));

vi.mock("@shared/const", () => ({
  COOKIE_NAME: "app_session_id",
  REFRESH_COOKIE_NAME: "app_refresh_id",
  ONE_YEAR_MS: 1000 * 60 * 60 * 24 * 365,
  ACCESS_TOKEN_LIFETIME_MS: 1000 * 60 * 60 * 24 * 7,
  REFRESH_TOKEN_LIFETIME_MS: 1000 * 60 * 60 * 24 * 30,
}));

vi.mock("./_core/env", () => ({
  getAppUrl: vi.fn().mockReturnValue("https://1commerce.online"),
}));

process.env.DATABASE_URL = "postgresql://test:test@localhost/test";

import { createHash } from "node:crypto";

function sha256(v: string) {
  return createHash("sha256").update(v).digest("hex");
}

// ── Import after mocks ───────────────────────────────────────────────────────
import { issueRefreshToken, rotateRefreshToken } from "./_core/customAuth";

function makeStoredToken(overrides: Partial<StoredToken> = {}): StoredToken {
  return {
    id: 1,
    userId: 42,
    tokenHash: sha256("valid-raw-token"),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    revokedAt: null,
    ipAddress: null,
    userAgent: null,
    lastUsedAt: new Date(),
    createdAt: new Date(),
    ...overrides,
  };
}

function makeStoredUser(overrides: Partial<StoredUser> = {}): StoredUser {
  return {
    id: 42,
    openId: "user-openid-42",
    name: "Test User",
    email: "test@example.com",
    username: "testuser",
    loginMethod: "password",
    deletedAt: null,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("issueRefreshToken", () => {
  beforeEach(() => {
    _state.tokens = [];
    _state.users = [];
    _state.nextId = 1;
    vi.clearAllMocks();
    mockDb.delete.mockReturnValue({ where: vi.fn(() => Promise.resolve()) });
    mockDb.insert.mockReturnValue({
      values: vi.fn((vals: Omit<StoredToken, "id" | "lastUsedAt" | "createdAt">) => {
        _state.tokens.push({
          id: _state.nextId++,
          lastUsedAt: new Date(),
          createdAt: new Date(),
          revokedAt: vals.revokedAt ?? null,
          ipAddress: vals.ipAddress ?? null,
          userAgent: vals.userAgent ?? null,
          ...vals,
        });
        return Promise.resolve();
      }),
    });
  });

  it("returns a raw token (64 hex chars for 32 bytes)", async () => {
    const result = await issueRefreshToken(42);
    expect(result).not.toBeNull();
    expect(result?.rawToken).toMatch(/^[0-9a-f]{64}$/);
  });

  it("stores the SHA-256 hash of the raw token, not the raw token itself", async () => {
    const result = await issueRefreshToken(42, { ipAddress: "127.0.0.1" });
    expect(result).not.toBeNull();
    const stored = _state.tokens[0];
    expect(stored).toBeDefined();
    // Hash must match
    expect(stored?.tokenHash).toBe(sha256(result!.rawToken));
    // Raw token must NOT be stored
    expect(stored?.tokenHash).not.toBe(result!.rawToken);
  });

  it("stores ipAddress and userAgent from opts", async () => {
    await issueRefreshToken(42, {
      ipAddress: "10.0.0.1",
      userAgent: "TestBrowser/1.0",
    });
    const stored = _state.tokens[0];
    expect(stored?.ipAddress).toBe("10.0.0.1");
    expect(stored?.userAgent).toBe("TestBrowser/1.0");
  });
});

describe("rotateRefreshToken", () => {
  beforeEach(() => {
    _state.tokens = [];
    _state.users = [];
    vi.clearAllMocks();
    mockDb.delete.mockReturnValue({ where: vi.fn(() => Promise.resolve()) });
  });

  it("rejects an unknown (never-issued) raw token", async () => {
    // select returns empty
    mockDb.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
      })),
    });

    const result = await rotateRefreshToken("unknown-token");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid/i);
  });

  it("rejects a revoked token", async () => {
    const storedToken = makeStoredToken({
      revokedAt: new Date(Date.now() - 1000), // already revoked
    });

    mockDb.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([storedToken])),
        })),
      })),
    });

    const result = await rotateRefreshToken("some-raw-token");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/revoked/i);
  });

  it("rejects an expired token", async () => {
    const storedToken = makeStoredToken({
      expiresAt: new Date(Date.now() - 1000), // expired
    });

    mockDb.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([storedToken])),
        })),
      })),
    });

    const result = await rotateRefreshToken("some-raw-token");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/expired/i);
  });

  it("accepts a valid token, returns sessionToken, and revokes the old token", async () => {
    const storedToken = makeStoredToken();
    const storedUser = makeStoredUser();

    // First select call → token; second → user
    let callCount = 0;
    mockDb.select.mockImplementation(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => {
            callCount++;
            if (callCount === 1) return Promise.resolve([storedToken]);
            return Promise.resolve([storedUser]);
          }),
        })),
      })),
    }));

    const updateWhereMock = vi.fn(() => Promise.resolve());
    mockDb.update.mockReturnValue({
      set: vi.fn(() => ({ where: updateWhereMock })),
    });

    // insert for new refresh token
    mockDb.insert.mockReturnValue({
      values: vi.fn((vals: Omit<StoredToken, "id" | "lastUsedAt" | "createdAt">) => {
        _state.tokens.push({
          id: _state.nextId++,
          lastUsedAt: new Date(),
          createdAt: new Date(),
          revokedAt: null,
          ipAddress: vals.ipAddress ?? null,
          userAgent: vals.userAgent ?? null,
          ...vals,
        });
        return Promise.resolve();
      }),
    });

    const result = await rotateRefreshToken("valid-raw-token");

    expect(result.success).toBe(true);
    expect(result.sessionToken).toBe("mock-access-token");
    expect(result.newRefreshToken).toBeDefined();
    expect(result.newRefreshToken).toMatch(/^[0-9a-f]{64}$/);
    // Old token must have been revoked
    expect(updateWhereMock).toHaveBeenCalledTimes(1);
  });
});
