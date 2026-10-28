import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("./team.repo", () => ({
  requireDb: vi.fn(),
  acceptInviteAtomic: vi.fn(),
}));
import { requireDb, acceptInviteAtomic } from "./team.repo";
import { acceptInvite } from "./team.service";
const actor = { id: 7, tenantId: 1 };
const token = "a".repeat(96);
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireDb).mockResolvedValue({} as never);
});
describe("team invitation acceptance", () => {
  it("returns only the atomically committed membership", async () => {
    vi.mocked(acceptInviteAtomic).mockResolvedValue({
      reason: "accepted",
      tenantId: 2,
      role: "user",
    });
    expect(await acceptInvite(actor, { token })).toEqual({
      tenantId: 2,
      role: "user",
    });
    expect(acceptInviteAtomic).toHaveBeenCalledWith(
      expect.anything(),
      7,
      token
    );
  });
  it.each(["unavailable", "email", "owner"] as const)(
    "rejects %s without claiming a switch",
    async reason => {
      vi.mocked(acceptInviteAtomic).mockResolvedValue({
        reason,
        tenantId: null,
        role: null,
      });
      await expect(acceptInvite(actor, { token })).rejects.toMatchObject({
        code: reason === "unavailable" ? "NOT_FOUND" : "FORBIDDEN",
      });
    }
  );
  it("propagates transaction failure rather than reporting acceptance", async () => {
    vi.mocked(acceptInviteAtomic).mockRejectedValue(
      new Error("membership write failed")
    );
    await expect(acceptInvite(actor, { token })).rejects.toThrow(
      "membership write failed"
    );
  });
});
