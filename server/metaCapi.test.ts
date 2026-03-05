/**
 * Meta CAPI credentials validation test
 * Validates META_PIXEL_ID (Madgicx CAPI Gateway Pixel: 1985866985330714)
 * and META_CAPI_ACCESS_TOKEN by sending a test event to the Meta CAPI
 * /events endpoint. A 200 response with events_received > 0 confirms
 * the Madgicx Gateway Pixel and CAPI token are both valid.
 */
import { describe, it, expect } from "vitest";

describe("Meta CAPI credentials", () => {
  it("VITE_META_PIXEL_ID is set and matches META_PIXEL_ID", () => {
    const vitePixelId = process.env.VITE_META_PIXEL_ID;
    const serverPixelId = process.env.META_PIXEL_ID;
    expect(vitePixelId).toBeDefined();
    expect(vitePixelId).toMatch(/^\d{10,20}$/);
    // Both should point to the same pixel
    expect(vitePixelId).toBe(serverPixelId);
  });

  it("META_PIXEL_ID is set and numeric", () => {
    const pixelId = process.env.META_PIXEL_ID;
    expect(pixelId).toBeDefined();
    expect(pixelId).toMatch(/^\d{10,20}$/);
  });

  it("META_CAPI_ACCESS_TOKEN is set and non-empty", () => {
    const token = process.env.META_CAPI_ACCESS_TOKEN;
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    expect((token as string).length).toBeGreaterThan(20);
  });

  it("Meta CAPI /events endpoint accepts the token (test event)", async () => {
    const token = process.env.META_CAPI_ACCESS_TOKEN!;
    const pixelId = process.env.META_PIXEL_ID!;

    const payload = {
      data: [
        {
          event_name: "PageView",
          event_time: Math.floor(Date.now() / 1000),
          action_source: "website",
          user_data: {
            client_ip_address: "127.0.0.1",
            client_user_agent: "vitest/1.0",
          },
        },
      ],
      test_event_code: "TEST1",
    };

    const res = await fetch(
      `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const json = (await res.json()) as {
      events_received?: number;
      messages?: string[];
      fbtrace_id?: string;
      error?: { message: string; code: number };
    };

    // A valid token returns 200 with events_received >= 1
    // An invalid token returns error code 190 (OAuthException)
    if (json.error && json.error.code === 190) {
      throw new Error(`Invalid CAPI token: ${json.error.message}`);
    }

    // Any non-auth error (e.g. data validation) still means the token is valid
    expect(res.status).toBe(200);
    expect(typeof json.events_received).toBe("number");
    expect(json.events_received).toBeGreaterThanOrEqual(1);
  }, 15_000);
});
