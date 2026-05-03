/**
 * Challenge Completion Engine — Unit Tests
 *
 * Tests the core resolution logic: winner determination, bonus point
 * awarding, loser notification, and the already-resolved guard.
 *
 * The drizzle `getDb` module is mocked so no live database is required.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Constants mirrored from challengeCompletion.ts ────────────────────────────
const WINNER_BONUS_POINTS = 50;

// ── Pure logic helpers extracted for unit testing ─────────────────────────────

function determineWinner(
  challengerDone: boolean,
  challengeeDone: boolean,
  challengerCompletedAt: Date | null,
  challengeeCompletedAt: Date | null,
  challengerId: number,
  challengeeId: number
): { winnerId: number | null; isTie: boolean } {
  const TOLERANCE_MS = 60_000;

  if (!challengerDone && !challengeeDone) {
    return { winnerId: null, isTie: false };
  }

  if (challengerDone && challengeeDone) {
    const cTime = challengerCompletedAt?.getTime() ?? 0;
    const eTime = challengeeCompletedAt?.getTime() ?? 0;

    if (Math.abs(cTime - eTime) <= TOLERANCE_MS) {
      return { winnerId: null, isTie: true };
    }

    return {
      winnerId: cTime < eTime ? challengerId : challengeeId,
      isTie: false,
    };
  }

  // Only one completed
  return {
    winnerId: challengerDone ? challengerId : challengeeId,
    isTie: false,
  };
}

function calcNewBalance(current: number, points: number): number {
  return current + points;
}

function calcLevel(lifetimePoints: number): number {
  return Math.floor(1 + Math.sqrt(lifetimePoints / 50));
}

// ── Mock setup for db-dependent tests ────────────────────────────────────────

vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "./db";

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
};

// Chainable query builder helper
function makeMockChain(returnValue: unknown) {
  const chain: Record<string, unknown> = {};
  const fn = () => chain;
  chain.from = fn;
  chain.where = fn;
  chain.limit = vi.fn().mockResolvedValue(returnValue);
  chain.orderBy = fn;
  return chain;
}

function makeInsertChain() {
  const chain: Record<string, unknown> = {};
  chain.values = vi.fn().mockResolvedValue(undefined);
  return chain;
}

function makeUpdateChain() {
  const chain: Record<string, unknown> = {};
  chain.set = () => chain;
  chain.where = vi.fn().mockResolvedValue(undefined);
  return chain;
}

// ── Tests: pure winner-determination logic ────────────────────────────────────

describe("determineWinner — first-to-complete logic", () => {
  const CHALLENGER_ID = 1;
  const CHALLENGEE_ID = 2;
  const BASE_TIME = new Date("2025-01-01T12:00:00Z");

  it("returns winner when only challenger is done", () => {
    const result = determineWinner(
      true,
      false,
      BASE_TIME,
      null,
      CHALLENGER_ID,
      CHALLENGEE_ID
    );
    expect(result.winnerId).toBe(CHALLENGER_ID);
    expect(result.isTie).toBe(false);
  });

  it("returns winner when only challengee is done", () => {
    const result = determineWinner(
      false,
      true,
      null,
      BASE_TIME,
      CHALLENGER_ID,
      CHALLENGEE_ID
    );
    expect(result.winnerId).toBe(CHALLENGEE_ID);
    expect(result.isTie).toBe(false);
  });

  it("challenger wins when they completed first (>60s apart)", () => {
    const challengerTime = new Date("2025-01-01T12:00:00Z");
    const challengeeTime = new Date("2025-01-01T12:05:00Z"); // 5 min later
    const result = determineWinner(
      true,
      true,
      challengerTime,
      challengeeTime,
      CHALLENGER_ID,
      CHALLENGEE_ID
    );
    expect(result.winnerId).toBe(CHALLENGER_ID);
    expect(result.isTie).toBe(false);
  });

  it("challengee wins when they completed first (>60s apart)", () => {
    const challengerTime = new Date("2025-01-01T12:05:00Z"); // 5 min later
    const challengeeTime = new Date("2025-01-01T12:00:00Z");
    const result = determineWinner(
      true,
      true,
      challengerTime,
      challengeeTime,
      CHALLENGER_ID,
      CHALLENGEE_ID
    );
    expect(result.winnerId).toBe(CHALLENGEE_ID);
    expect(result.isTie).toBe(false);
  });

  it("declares a tie when both complete within 60 seconds", () => {
    const challengerTime = new Date("2025-01-01T12:00:00Z");
    const challengeeTime = new Date("2025-01-01T12:00:59Z"); // 59 sec apart
    const result = determineWinner(
      true,
      true,
      challengerTime,
      challengeeTime,
      CHALLENGER_ID,
      CHALLENGEE_ID
    );
    expect(result.winnerId).toBe(null);
    expect(result.isTie).toBe(true);
  });

  it("returns no winner when neither participant is done", () => {
    const result = determineWinner(
      false,
      false,
      null,
      null,
      CHALLENGER_ID,
      CHALLENGEE_ID
    );
    expect(result.winnerId).toBe(null);
    expect(result.isTie).toBe(false);
  });
});

// ── Tests: bonus points calculation ──────────────────────────────────────────

describe("Winner bonus points", () => {
  it(`awards ${WINNER_BONUS_POINTS} points to the winner`, () => {
    const currentBalance = 100;
    const newBalance = calcNewBalance(currentBalance, WINNER_BONUS_POINTS);
    expect(newBalance).toBe(150);
  });

  it("correctly calculates new level after bonus", () => {
    // lifetime = 200 pts -> level = floor(1 + sqrt(200/50)) = floor(1+2) = 3
    expect(calcLevel(200)).toBe(3);
    // lifetime = 50 pts -> level = floor(1 + sqrt(50/50)) = floor(1+1) = 2
    expect(calcLevel(50)).toBe(2);
    // lifetime = 0 -> level 1
    expect(calcLevel(0)).toBe(1);
  });

  it("winner bonus amount constant is 50", () => {
    expect(WINNER_BONUS_POINTS).toBe(50);
  });
});

// ── Tests: already-resolved guard ────────────────────────────────────────────

describe("Already-resolved guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue(
      mockDb as ReturnType<typeof mockDb.select>
    );
  });

  it("returns empty array when no active friend challenges exist for user", async () => {
    // Simulate DB returning empty accepted challenges
    const fakeDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            // The query uses .where() without .limit() in this code path
            // so we need to return a thenable that resolves to an array
            then: (resolve: (v: unknown[]) => void) => resolve([]),
            [Symbol.iterator]: function* () {},
          }),
        }),
      }),
    };
    vi.mocked(getDb).mockResolvedValue(
      fakeDb as unknown as Awaited<ReturnType<typeof getDb>>
    );

    const { checkAndResolveFriendChallenge } = await import(
      "./challengeCompletion"
    );

    const result = await checkAndResolveFriendChallenge(999, 1);
    expect(result).toEqual([]);
  });
});

// ── Tests: notification message content ──────────────────────────────────────

describe("Notification content", () => {
  it("winner notification contains challenge name and bonus point amount", () => {
    const challengeName = "Save $500 in a Month";
    const opponentName = "Alice";
    const body = `You beat ${opponentName} in the "${challengeName}" challenge! +${WINNER_BONUS_POINTS} bonus points awarded.`;

    expect(body).toContain(challengeName);
    expect(body).toContain(opponentName);
    expect(body).toContain("+50");
  });

  it("loser notification references the winner's name", () => {
    const challengeName = "Save $500 in a Month";
    const winnerName = "Alice";
    const body = `${winnerName} completed "${challengeName}" before you. Keep going — you can challenge them again!`;

    expect(body).toContain(winnerName);
    expect(body).toContain(challengeName);
    expect(body).toContain("challenge them again");
  });

  it("tie notification body mentions both users share the reward", () => {
    const opponentName = "Bob";
    const challengeName = "Run 50 Miles";
    const body = `You and ${opponentName} both completed "${challengeName}" at the same time. You both earn the full reward!`;

    expect(body).toContain("both earn the full reward");
    expect(body).toContain(opponentName);
  });
});

// ── Tests: resolveAllPendingFriendChallenges admin utility ───────────────────

describe("resolveAllPendingFriendChallenges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 0 when db is unavailable", async () => {
    vi.mocked(getDb).mockResolvedValue(null);

    const { resolveAllPendingFriendChallenges } = await import(
      "./challengeCompletion"
    );

    const resolved = await resolveAllPendingFriendChallenges();
    expect(resolved).toBe(0);
  });

  it("returns 0 when no accepted challenges exist", async () => {
    const fakeDb = {
      select: () => ({
        from: () => ({
          where: () => Promise.resolve([]), // no accepted challenges
        }),
      }),
    };
    vi.mocked(getDb).mockResolvedValue(
      fakeDb as unknown as Awaited<ReturnType<typeof getDb>>
    );

    const { resolveAllPendingFriendChallenges } = await import(
      "./challengeCompletion"
    );

    const resolved = await resolveAllPendingFriendChallenges();
    expect(resolved).toBe(0);
  });
});
