import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  RESOURCE_DOWNLOADS,
  registerResourceDownloadFetchRoutes,
} from "./resourceDownloads";

describe("resource download routes", () => {
  it("serves every listed generated resource as an attachment", async () => {
    for (const resource of Object.values(RESOURCE_DOWNLOADS)) {
      const req = new Request(
        `https://app.test/api/resources/${resource.id}/download`
      );
      const resp = await registerResourceDownloadFetchRoutes(req);

      expect(resp).not.toBeNull();
      expect(resp!.status).toBe(200);
      expect(resp!.headers.get("content-type")).toBe(resource.contentType);
      expect(resp!.headers.get("content-disposition")).toContain(
        resource.filename
      );
      expect((await resp!.text()).length).toBeGreaterThan(20);
    }
  });

  it("returns null for unrelated routes", async () => {
    const resp = await registerResourceDownloadFetchRoutes(
      new Request("https://app.test/api/resources")
    );

    expect(resp).toBeNull();
  });

  it("returns 404 for unknown resources", async () => {
    const resp = await registerResourceDownloadFetchRoutes(
      new Request("https://app.test/api/resources/not-real/download")
    );

    expect(resp).not.toBeNull();
    expect(resp!.status).toBe(404);
  });

  it("backs every Resources page download with an app-served route", () => {
    const resourcesPage = readFileSync(
      new URL("../client/src/pages/Resources.tsx", import.meta.url),
      "utf8"
    );
    const downloadUrls = [
      ...resourcesPage.matchAll(/downloadUrl: "([^"]+)"/g),
    ].map(match => match[1]);

    expect(downloadUrls.length).toBeGreaterThan(0);
    expect(downloadUrls.filter(url => /^https?:\/\//.test(url))).toEqual([]);

    for (const url of downloadUrls) {
      const match = url.match(/^\/api\/resources\/([^/]+)\/download$/);
      expect(match, `${url} should use the generated download route`).not.toBe(
        null
      );
      expect(
        RESOURCE_DOWNLOADS[match![1]],
        `${url} should be registered`
      ).toBeDefined();
    }
  });
});
