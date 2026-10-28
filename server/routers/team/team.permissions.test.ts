import { describe, expect, it, vi } from "vitest";
vi.mock("./team.service", () => ({
  invite: vi.fn(),
  revokeInvite: vi.fn(),
  listInvites: vi.fn(),
}));
import { teamRouter } from "./index";
import * as service from "./team.service";
const context = {
  user: { id: 7, tenantId: 1, role: "user", emailVerified: true },
  req: {},
  res: {},
};
describe("team management permissions", () => {
  it("does not expose invitation bearer tokens to ordinary members", async () => {
    expect(
      await teamRouter.createCaller(context as never).listInvites()
    ).toEqual([]);
    expect(service.listInvites).not.toHaveBeenCalled();
  });
  it("prevents members from granting admin roles through invitations", async () => {
    await expect(
      teamRouter
        .createCaller(context as never)
        .invite({ email: "other@example.com", role: "admin" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(service.invite).not.toHaveBeenCalled();
  });
  it("prevents members from revoking another administrator's invitations", async () => {
    await expect(
      teamRouter.createCaller(context as never).revokeInvite({ id: 8 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(service.revokeInvite).not.toHaveBeenCalled();
  });
});
