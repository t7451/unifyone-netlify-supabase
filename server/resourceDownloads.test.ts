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

  it("links every Resources guide to a registered app page", () => {
    const resourcesPage = readFileSync(
      new URL("../client/src/pages/Resources.tsx", import.meta.url),
      "utf8"
    );
    const routesSource = readFileSync(
      new URL("../client/src/app/routes.tsx", import.meta.url),
      "utf8"
    );
    const guideUrls = [...resourcesPage.matchAll(/href: "([^"]+)"/g)].map(
      match => match[1]
    );
    const routes = [
      ...routesSource.matchAll(/<Route\s+(?:[^>]*?\s)?path="([^"]+)"/g),
    ].map(match => match[1]);
    expect(guideUrls.length).toBeGreaterThan(0);
    expect(routes.length).toBeGreaterThan(0);
    for (const url of guideUrls) {
      expect(url, "Guides should point to an app page").toMatch(/^\/(?!\/)/);
      const pathname = url.split(/[?#]/)[0];
      const registered = routes.some(route => {
        if (!route.includes(":")) return route === pathname;
        return new RegExp("^" + route.replace(/:[^/]+/g, "[^/]+") + "$").test(
          pathname
        );
      });
      expect(registered, url + " should resolve to a registered route").toBe(
        true
      );
    }
  });
});
