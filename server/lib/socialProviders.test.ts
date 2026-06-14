import { describe, it, expect, beforeEach } from "vitest";
import {
  registerProvider,
  getProvider,
  hasProvider,
  listRegisteredPlatforms,
  isSocialPlatform,
  __resetProvidersForTest,
  type SocialProvider,
} from "./socialProviders";

const stub = (platform: SocialProvider["platform"]): SocialProvider => ({
  platform,
  publish: async () => ({ ok: true }),
});

describe("socialProviders registry", () => {
  beforeEach(() => __resetProvidersForTest());

  it("registers and resolves a provider", () => {
    const p = stub("bluesky");
    registerProvider(p);
    expect(getProvider("bluesky")).toBe(p);
    expect(hasProvider("bluesky")).toBe(true);
    expect(listRegisteredPlatforms()).toEqual(["bluesky"]);
  });

  it("rejects duplicate registration", () => {
    registerProvider(stub("mastodon"));
    expect(() => registerProvider(stub("mastodon"))).toThrow(/already/);
  });

  it("returns undefined for unknown or unregistered platforms", () => {
    expect(getProvider("bluesky")).toBeUndefined();
    expect(getProvider("not-a-platform")).toBeUndefined();
    expect(hasProvider("not-a-platform")).toBe(false);
  });

  it("validates known platform names (incl. v1 targets)", () => {
    expect(isSocialPlatform("bluesky")).toBe(true);
    expect(isSocialPlatform("mastodon")).toBe(true);
    expect(isSocialPlatform("linkedin")).toBe(true);
    expect(isSocialPlatform("myspace")).toBe(false);
    expect(isSocialPlatform(42)).toBe(false);
  });
});
