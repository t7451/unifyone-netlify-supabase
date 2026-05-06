import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChallengeProgressSnapshot } from "./challengeCompletion";

vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "./db";
import {
  challengeCompletionInternals,
  determineChallengeOutcome,
  resolveFriendChallengeRecord,
} from "./challengeCompletion";

const baseChallenge = {
  id: 7,
  name: "Weekly Miles",
  description: "Log miles this week",
  type: "weekly",
  category: "gig",
  goal: 100,
  unit: "miles",
  pointsReward: 100,
  bonusReward: null,
  startsAt: new Date("2025-01-01T00:00:00Z"),
  endsAt: new Date("2025-01-07T23:59:59Z"),
  maxParticipants: null,
  participantCount: 0,
  active: true,
  createdAt: new Date("2025-01-01T00:00:00Z"),
} as const;

const baseFriendChallenge = {
  id: 10,
  challengerId: 1,
  challengeeId: 2,
  challengeId: 7,
  message: null,
  status: "accepted",
  winnerId: null,
  acceptedAt: new Date("2025-01-01T00:00:00Z"),
  completedAt: null,
  resolvedAt: null,
  winnerNotified: false,
  loserNotified: false,
  createdAt: new Date("2025-01-01T00:00:00Z"),
  updatedAt: new Date("2025-01-01T00:00:00Z"),
} as const;

function snapshot(
  userId: number,
  progress: number,
  goalReachedAt: string | null,
  updatedAt = goalReachedAt
): ChallengeProgressSnapshot {
  return {
    userId,
    progress,
    goalReachedAt: goalReachedAt ? new Date(goalReachedAt) : null,
    updatedAt: updatedAt ? new Date(updatedAt) : null,
  };
}

describe("challenge completion detection", () => {
  it("identifies the winner when only one participant hits the goal", () => {
    const outcome = determineChallengeOutcome(
      snapshot(1, 125, "2025-01-03T12:00:00Z"),
      snapshot(2, 80, null, "2025-01-03T12:05:00Z"),
      100,
      new Date("2025-01-03T12:05:00Z")
    );

    expect(outcome).toMatchObject({
      winnerUserId: 1,
      winnerUserIds: [1],
      loserUserIds: [2],
      isTie: false,
    });
  });

  it("uses first-to-hit-goal timestamps as the tie-breaker", () => {
    const outcome = determineChallengeOutcome(
      snapshot(1, 100, "2025-01-03T12:00:01Z"),
      snapshot(2, 140, "2025-01-03T11:59:59Z"),
      100,
      new Date("2025-01-03T12:01:00Z")
    );

    expect(outcome).toMatchObject({
      winnerUserId: 2,
      winnerUserIds: [2],
      loserUserIds: [1],
      isTie: false,
    });
  });

  it("treats truly simultaneous completions as a tie", () => {
    const outcome = determineChallengeOutcome(
      snapshot(1, 100, "2025-01-03T12:00:00Z"),
      snapshot(2, 120, "2025-01-03T12:00:00Z"),
      100,
      new Date("2025-01-03T12:01:00Z")
    );

    expect(outcome).toMatchObject({
      winnerUserId: null,
      winnerUserIds: [1, 2],
      loserUserIds: [],
      isTie: true,
    });
  });

  it("already-resolved guard prevents double-notification work", async () => {
    const updateSpy = vi.fn();
    const insertSpy = vi.fn();

    const fakeDb = {
      update: updateSpy,
      insert: insertSpy,
    } as unknown as NonNullable<Awaited<ReturnType<typeof getDb>>>;

    const resolved = await resolveFriendChallengeRecord(
      fakeDb,
      {
        ...baseFriendChallenge,
        resolvedAt: new Date("2025-01-04T00:00:00Z"),
      },
      baseChallenge
    );

    expect(resolved).toBe(false);
    expect(updateSpy).not.toHaveBeenCalled();
    expect(insertSpy).not.toHaveBeenCalled();
  });
});

describe("challenge completion helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("derives cumulative progress from ordered events", () => {
    const built = challengeCompletionInternals.buildSnapshotFromEvents(
      5,
      100,
      "miles",
      [
        { occurredAt: new Date("2025-01-03T12:00:00Z"), value: 40 },
        { occurredAt: new Date("2025-01-02T12:00:00Z"), value: 35 },
        { occurredAt: new Date("2025-01-04T12:00:00Z"), value: 30 },
      ]
    );

    expect(built.progress).toBe(105);
    expect(built.goalReachedAt).toEqual(new Date("2025-01-04T12:00:00Z"));
  });

  it("falls back to no-op when db is unavailable", async () => {
    vi.mocked(getDb).mockResolvedValue(null);
    const module = await import("./challengeCompletion");

    await expect(
      module.checkAndResolveFriendChallenges(7, 1)
    ).resolves.toBeUndefined();
  });
});
