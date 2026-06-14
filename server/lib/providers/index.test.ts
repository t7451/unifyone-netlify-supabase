import { describe, it, expect } from "vitest";
import { registerBuiltinSocialProviders } from "./index";
import { hasProvider, listRegisteredPlatforms } from "../socialProviders";

describe("registerBuiltinSocialProviders", () => {
  it("registers the built-in providers and is idempotent", () => {
    registerBuiltinSocialProviders();
    expect(hasProvider("bluesky")).toBe(true);
    expect(listRegisteredPlatforms()).toContain("bluesky");
    // Calling again must not throw (guarded against duplicate registration).
    expect(() => registerBuiltinSocialProviders()).not.toThrow();
  });
});
