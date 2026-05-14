import { describe, it, expect, beforeAll } from "vitest";

process.env.JWT_SECRET =
  process.env.JWT_SECRET ||
  "test-secret-test-secret-test-secret-test-secret"; // >= 32 chars

import {
  buildClipsDownloadResponse,
  CLIPS_DOWNLOAD_CONTENT_TYPE,
  signClipsDownloadToken,
  verifyClipsDownloadToken,
} from "./clipsToolkit";

describe("clipsToolkit download route", () => {
  let validToken: string;

  beforeAll(async () => {
    validToken = await signClipsDownloadToken({
      sub: "cs_test_abc",
      email: "buyer@example.com",
    });
  });

  it("rejects requests with no token", async () => {
    const res = await buildClipsDownloadResponse(null);
    expect(res.status).toBe(401);
  });

  it("rejects requests with an invalid token", async () => {
    const res = await buildClipsDownloadResponse("not-a-token");
    expect(res.status).toBe(403);
  });

  it("streams the xlsx with the correct content type for a valid token", async () => {
    const res = await buildClipsDownloadResponse(validToken);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe(CLIPS_DOWNLOAD_CONTENT_TYPE);
    expect(res.headers.get("Content-Disposition")).toMatch(
      /attachment; filename="1Commerce_GenAI/
    );
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    const buf = await res.arrayBuffer();
    // .xlsx files are zip archives whose first two bytes are 'PK' (0x50 0x4B).
    expect(buf.byteLength).toBeGreaterThan(0);
    const view = new Uint8Array(buf);
    expect(view[0]).toBe(0x50);
    expect(view[1]).toBe(0x4b);
  });

  it("signClipsDownloadToken / verifyClipsDownloadToken round-trip", async () => {
    const token = await signClipsDownloadToken({
      sub: "cs_test_xyz",
      email: null,
    });
    const decoded = await verifyClipsDownloadToken(token);
    expect(decoded.sub).toBe("cs_test_xyz");
    expect(decoded.email).toBeNull();
  });
});
