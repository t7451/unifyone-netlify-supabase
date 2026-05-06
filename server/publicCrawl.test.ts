import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const CLIENT_SRC = join(ROOT, "client/src");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap(entry => {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) return walk(path);
    return /\.(ts|tsx)$/.test(path) ? [path] : [];
  });
}

function appRoutes() {
  const app = readFileSync(join(CLIENT_SRC, "App.tsx"), "utf8");
  return [...app.matchAll(/<Route\s+(?:[^>]*?\s)?path="([^"]+)"/g)].map(
    match => match[1]
  );
}

function routeMatches(path: string, routes: string[]) {
  return routes.some(route => {
    if (!route.includes(":")) return route === path;
    const pattern = `^${route.replace(/:[^/]+/g, "[^/]+")}$`;
    return new RegExp(pattern).test(path);
  });
}

function internalLinks() {
  const linkPattern =
    /(?:href|to)=(?:"([^"]+)"|'([^']+)'|\{"([^"]+)"\}|\{'([^']+)'\})/g;

  return walk(CLIENT_SRC)
    .filter(file => !file.includes("/components/ui/"))
    .flatMap(file => {
      const source = readFileSync(file, "utf8");
      return [...source.matchAll(linkPattern)]
        .map(match => match.slice(1).find(Boolean))
        .filter((href): href is string => Boolean(href))
        .filter(
          href =>
            href.startsWith("/") &&
            !href.startsWith("//") &&
            !href.startsWith("/api/")
        )
        .filter(href => !href.includes("${"))
        .map(href => ({
          href,
          path: href.split(/[?#]/)[0],
          file: file.replace(`${ROOT}/`, ""),
        }));
    });
}

describe("public crawl readiness", () => {
  it("keeps static internal links aligned with registered routes", () => {
    const routes = appRoutes();
    const missing = internalLinks().filter(
      link => !routeMatches(link.path, routes)
    );

    expect(missing).toEqual([]);
  });

  it("keeps public sitemap entries aligned with registered routes", () => {
    const routes = appRoutes();
    const sitemap = readFileSync(
      join(ROOT, "client/public/sitemap.xml"),
      "utf8"
    );
    const paths = [...sitemap.matchAll(/<loc>__APP_URL__([^<]+)<\/loc>/g)].map(
      match => match[1]
    );

    expect(paths.length).toBeGreaterThan(0);
    expect(paths.filter(path => !routeMatches(path, routes))).toEqual([]);
  });
});
