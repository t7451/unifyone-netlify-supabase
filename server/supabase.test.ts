import { describe, it, expect } from "vitest";

/**
 * Validates that Supabase environment variables are either both set correctly
 * or both absent (graceful degradation mode).
 * The app works without Supabase — Realtime is an optional enhancement.
 */
describe("Supabase configuration", () => {
  it("either both Supabase vars are set or both are absent (graceful degradation)", () => {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_ANON_KEY;

    const urlSet = Boolean(url && url.length > 0);
    const keySet = Boolean(key && key.length > 0);

    if (urlSet || keySet) {
      // If either is set, both must be set
      expect(urlSet).toBe(true);
      expect(keySet).toBe(true);
      // URL must look like a valid Supabase URL
      expect(url).toMatch(/^https:\/\/.+\.supabase\.co/);
      console.log("[Supabase] Realtime credentials configured — live updates enabled");
    } else {
      // Both absent — graceful degradation, app works in polling mode
      console.log("[Supabase] No credentials set — app running in polling mode (Realtime disabled)");
      expect(urlSet).toBe(false);
      expect(keySet).toBe(false);
    }
  });
});
