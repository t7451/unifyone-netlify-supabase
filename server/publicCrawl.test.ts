import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { ROUTE_SEO } from "@/content/routeSeo";
import { SEO_PAGES } from "@/content/seoPages";

const ROOT = new URL("..", import.meta.url).pathname;
const CLIENT_SRC = join(ROOT, "client/src");

// Mirror of the sitemap paths derived in vite.config.ts (SITEMAP_ROUTES): the
// homepage, the /seo guides index, every ROUTE_SEO path, and one /seo/:slug per
// SEO_PAGES entry. The sitemap.xml is generated from these registries at build
// time (vite-plugin-sitemap.js), so this is the source of truth to check
// against — not a hand-maintained file.
const sitemapPaths = [
  "/",
  "/seo",
  ...ROUTE_SEO.map(route => route.path),
  ...SEO_PAGES.map(page => `/seo/${page.slug}`),
];

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

  it("keeps derived sitemap entries aligned with registered routes", () => {
    const routes = appRoutes();

    expect(sitemapPaths.length).toBeGreaterThan(0);
    expect(sitemapPaths.filter(path => !routeMatches(path, routes))).toEqual(
      []
    );
  });
});
