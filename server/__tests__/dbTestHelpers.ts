import { vi } from "vitest";
import type { TrpcContext } from "../_core/context";

// ── NOTE: vi.mock() factory hoisting ─────────────────────────────────────────
// Vitest hoists vi.mock() calls to the top of the file before imports are
// resolved. This means you CANNOT use imported helpers (like makeMockDb or
// legacyDbMocks below) inside a vi.mock() factory. Instead, define _dbState
// as a top-level const in each test file so the factory can capture it by
// reference (the same pattern used in notifications.test.ts).
//
// The makeCtx() function CAN be imported and used normally in test bodies
// (outside the factory), so it's extracted here to eliminate repetition.

/**
 * Builds a minimal TrpcContext for use in router caller tests.
 * Defaults to an admin user with tenantId=1.
 * Safe to import in test bodies (not inside vi.mock factories).
 */
export function makeCtx(overrides: Partial<TrpcContext> = {}): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "local",
      role: "admin",
      tenantId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      creditBalance: 0,
    } as any,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    ...overrides,
  };
}

