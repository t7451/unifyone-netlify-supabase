import { describe, it, expect, vi, beforeEach } from "vitest";

// Queue of results returned by successive `db.select()...where()` calls.
let selectQueue: unknown[][] = [];
const updateWhere = vi.fn(async () => undefined);

const fakeDb = {
  update: () => ({ set: () => ({ where: updateWhere }) }),
  select: () => ({
    from: () => ({ where: async () => selectQueue.shift() ?? [] }),
  }),
};

vi.mock("../db", () => ({ getDb: async () => fakeDb }));

const publishToConnectedAccounts = vi.fn(async () => []);
vi.mock("./socialPublisher", () => ({
  publishToConnectedAccounts: (...a: unknown[]) =>
    publishToConnectedAccounts(...a),
}));

const fireAutomations = vi.fn(async () => undefined);
vi.mock("./automationDispatch", () => ({
  fireAutomations: (...a: unknown[]) => fireAutomations(...a),
}));

import {
  publishStoredPost,
  processScheduledSocialPosts,
} from "./socialScheduler";

const post = (over: Record<string, unknown> = {}) => ({
  id: 1,
  tenantId: 7,
  userId: 3,
  content: "hello",
  platforms: ["bluesky"],
  mediaUrls: null,
  campaignTag: null,
  utmCampaign: null,
  ...over,
});

describe("publishStoredPost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectQueue = [];
  });

  it("marks published, dispatches natively, and fires the automation event", async () => {
    selectQueue = [[post()]];
    const res = await publishStoredPost(7, 1, { userId: 3 });

    expect(updateWhere).toHaveBeenCalledTimes(1); // status -> published
    expect(publishToConnectedAccounts).toHaveBeenCalledWith(7, ["bluesky"], {
      content: "hello",
      mediaUrls: undefined,
    });
    expect(fireAutomations).toHaveBeenCalledWith(
      7,
      "social.post.published",
      expect.objectContaining({ postId: 1, userId: 3 })
    );
    expect(res).toEqual({ success: true, results: [] });
  });
});

describe("processScheduledSocialPosts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectQueue = [];
  });

  it("publishes every due post and returns counts", async () => {
    const due = [post({ id: 1 }), post({ id: 2 })];
    // 1st select = due query; then one select per post inside publishStoredPost.
    selectQueue = [due, [due[0]], [due[1]]];

    const res = await processScheduledSocialPosts(new Date());

    expect(res).toEqual({ processed: 2, published: 2 });
    expect(publishToConnectedAccounts).toHaveBeenCalledTimes(2);
  });

  it("returns zero counts when nothing is due", async () => {
    selectQueue = [[]];
    const res = await processScheduledSocialPosts(new Date());
    expect(res).toEqual({ processed: 0, published: 0 });
    expect(publishToConnectedAccounts).not.toHaveBeenCalled();
  });
});
