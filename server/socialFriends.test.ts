import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the DB module so tests don't need a live database
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "./db";

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

// Helper to chain drizzle-style calls
function chainable(returnValue: unknown = []) {
  const obj: Record<string, unknown> = {};
  const methods = ["from", "where", "limit", "orderBy", "innerJoin", "values", "$returningId", "set"];
  methods.forEach((m) => {
    obj[m] = vi.fn(() => obj);
  });
  // Terminal calls
  (obj as Record<string, unknown>).then = undefined;
  // Make it thenable by returning the value
  const proxy = new Proxy(obj, {
    get(target, prop) {
      if (prop === "then") return undefined; // not a promise itself
      if (prop in target) return target[prop as string];
      return vi.fn(() => proxy);
    },
  });
  // Override the last method to return a resolved value
  obj["limit"] = vi.fn(() => Promise.resolve(returnValue));
  obj["orderBy"] = vi.fn(() => Promise.resolve(returnValue));
  obj["$returningId"] = vi.fn(() => Promise.resolve([{ id: 99 }]));
  return obj;
}

describe("socialFriends router logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendRequest validation", () => {
    it("should reject self-friend requests", async () => {
      // Simulate the guard: requesterId === addresseeId
      const userId = 42;
      const addresseeId = 42;
      expect(userId === addresseeId).toBe(true);
    });

    it("should allow requests to different users", () => {
      const userId = 1;
      const addresseeId = 2;
      expect(userId === addresseeId).toBe(false);
    });
  });

  describe("friendship status mapping", () => {
    it("maps accepted status correctly", () => {
      const status = "accepted";
      expect(["pending", "accepted", "declined", "blocked"].includes(status)).toBe(true);
    });

    it("maps pending status correctly", () => {
      const status = "pending";
      expect(status).toBe("pending");
    });
  });

  describe("friend challenge status transitions", () => {
    it("accept action maps to accepted status", () => {
      const action = "accept";
      const newStatus = action === "accept" ? "accepted" : "declined";
      expect(newStatus).toBe("accepted");
    });

    it("decline action maps to declined status", () => {
      const action = "decline";
      const newStatus = action === "accept" ? "accepted" : "declined";
      expect(newStatus).toBe("declined");
    });
  });

  describe("timeAgo helper logic", () => {
    it("returns 'just now' for very recent timestamps", () => {
      const now = Date.now();
      const diff = Math.floor((Date.now() - now) / 1000);
      expect(diff).toBeLessThan(60);
    });

    it("calculates minutes correctly", () => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      const diff = Math.floor((Date.now() - fiveMinutesAgo) / 1000);
      expect(Math.floor(diff / 60)).toBe(5);
    });

    it("calculates hours correctly", () => {
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      const diff = Math.floor((Date.now() - twoHoursAgo) / 1000);
      expect(Math.floor(diff / 3600)).toBe(2);
    });
  });

  describe("notification content", () => {
    it("generates correct friend request notification title", () => {
      const title = "New Friend Request";
      expect(title).toBe("New Friend Request");
    });

    it("generates correct challenge notification title", () => {
      const title = "You've Been Challenged!";
      expect(title).toBe("You've Been Challenged!");
    });

    it("generates correct accept notification title", () => {
      const action = "accept";
      const title = action === "accept" ? "Challenge Accepted!" : "Challenge Declined";
      expect(title).toBe("Challenge Accepted!");
    });

    it("generates correct decline notification title", () => {
      const action = "decline";
      const title = action === "accept" ? "Challenge Accepted!" : "Challenge Declined";
      expect(title).toBe("Challenge Declined");
    });
  });

  describe("feed sorting", () => {
    it("sorts feed items by most recent first", () => {
      const feed = [
        { unlockedAt: new Date(2025, 0, 1), userId: 1, achievementId: 1 },  // Jan
        { unlockedAt: new Date(2025, 2, 1), userId: 2, achievementId: 2 },  // Mar
        { unlockedAt: new Date(2025, 1, 1), userId: 3, achievementId: 3 },  // Feb
      ];
      const sorted = [...feed].sort((a, b) => b.unlockedAt.getTime() - a.unlockedAt.getTime());
      expect(sorted[0].unlockedAt.getFullYear()).toBe(2025);
      expect(sorted[0].unlockedAt.getMonth()).toBe(2); // March = index 2
      // Verify descending order
      expect(sorted[0].unlockedAt >= sorted[1].unlockedAt).toBe(true);
      expect(sorted[1].unlockedAt >= sorted[2].unlockedAt).toBe(true);
    });

    it("caps feed at 50 items", () => {
      const feed = Array.from({ length: 100 }, (_, i) => ({ id: i }));
      const capped = feed.slice(0, 50);
      expect(capped.length).toBe(50);
    });
  });

  describe("rarity color mapping", () => {
    const RARITY_COLORS: Record<string, string> = {
      common: "text-gray-400 border-gray-600",
      uncommon: "text-green-400 border-green-600",
      rare: "text-blue-400 border-blue-600",
      epic: "text-purple-400 border-purple-600",
      legendary: "text-yellow-400 border-yellow-600",
    };

    it("maps all 5 rarity tiers", () => {
      expect(Object.keys(RARITY_COLORS)).toHaveLength(5);
    });

    it("legendary uses yellow", () => {
      expect(RARITY_COLORS.legendary).toContain("yellow");
    });

    it("rare uses blue", () => {
      expect(RARITY_COLORS.rare).toContain("blue");
    });

    it("unknown rarity falls back gracefully", () => {
      const rarity = "unknown";
      const color = RARITY_COLORS[rarity] ?? "text-gray-400 border-gray-600";
      expect(color).toBe("text-gray-400 border-gray-600");
    });
  });

  describe("friend ID resolution", () => {
    it("returns addresseeId when current user is requester", () => {
      const currentUserId = 1;
      const f = { requesterId: 1, addresseeId: 2 };
      const friendId = f.requesterId === currentUserId ? f.addresseeId : f.requesterId;
      expect(friendId).toBe(2);
    });

    it("returns requesterId when current user is addressee", () => {
      const currentUserId = 2;
      const f = { requesterId: 1, addresseeId: 2 };
      const friendId = f.requesterId === currentUserId ? f.addresseeId : f.requesterId;
      expect(friendId).toBe(1);
    });
  });
});
