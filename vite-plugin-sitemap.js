// vite-plugin-sitemap.js
// Drop this file into your project root and import it in vite.config.js
//
// Usage in vite.config.js:
//   import { defineConfig } from 'vite'
//   import react from '@vitejs/plugin-react'
//   import { sitemapPlugin } from './vite-plugin-sitemap'
//
//   export default defineConfig({
//     plugins: [
//       react(),
//       sitemapPlugin({
//         hostname: 'https://1commerce.online',
//         outDir: 'dist/public',
//         routes: [
//           { path: '/', changefreq: 'weekly', priority: 1.0 },
//           { path: '/pricing', changefreq: 'monthly', priority: 0.9 },
//         ],
//       }),
//     ],
//   })
//
// Behavior:
//   - sitemap.xml is ALWAYS (re)generated from `routes`, so it never drifts
//     from the route registries that feed it.
//   - robots.txt is only written when the output directory does NOT already
//     contain one — the hand-maintained client/public/robots.txt is copied to
//     dist by Vite and must never be overwritten.

import { existsSync, writeFileSync } from "fs";
import { resolve } from "path";

/**
 * @typedef {Object} RouteEntry
 * @property {string}  path        — URL path relative to hostname (e.g. '/pricing')
 * @property {string}  [changefreq] — always | hourly | daily | weekly | monthly | yearly | never
 * @property {number}  [priority]   — 0.0 – 1.0
 * @property {string}  [lastmod]    — ISO date string; defaults to build date
 */

/**
 * @typedef {Object} SitemapPluginOptions
 * @property {string}       hostname  — Full origin with protocol (e.g. 'https://1commerce.online')
 * @property {RouteEntry[]} routes    — Array of route entries
 * @property {string}       [outDir]  — Override output directory; defaults to 'dist'
 */

/** Escape the five XML-significant characters for use inside element text. */
function escapeXml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Vite plugin that generates sitemap.xml at build time (always) and a fallback
 * robots.txt (only when one is not already present in the output directory).
 * @param {SitemapPluginOptions} options
 * @returns {import('vite').Plugin}
 */
export function sitemapPlugin(options) {
  const { hostname, routes } = options;

  if (!hostname || !routes?.length) {
    throw new Error("[vite-plugin-sitemap] hostname and routes are required");
  }

  // Strip trailing slash from hostname
  const origin = hostname.replace(/\/+$/, "");

  return {
    name: "vite-plugin-sitemap",
    apply: "build",
    closeBundle() {
      const outDir = options.outDir || "dist";
      const today = new Date().toISOString().split("T")[0];

      const sitemapPath = resolve(outDir, "sitemap.xml");
      const robotsPath = resolve(outDir, "robots.txt");

      // ── Build sitemap.xml (always regenerated from `routes`) ───────────
      // Always (re)write so the sitemap can never drift from the route
      // registries that feed it. Any stale public/sitemap.xml copied into the
      // output dir is overwritten here.
      const urls = routes
        .map(r => {
          const loc = escapeXml(`${origin}${r.path}`);
          const lastmod = r.lastmod || today;
          const changefreq = r.changefreq || "monthly";
          const priority = r.priority ?? 0.5;
          return [
            "  <url>",
            `    <loc>${loc}</loc>`,
            `    <lastmod>${lastmod}</lastmod>`,
            `    <changefreq>${changefreq}</changefreq>`,
            `    <priority>${priority.toFixed(1)}</priority>`,
            "  </url>",
          ].join("\n");
        })
        .join("\n");

      const sitemap = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        urls,
        "</urlset>",
        "",
      ].join("\n");

      writeFileSync(sitemapPath, sitemap, "utf-8");
      console.log(
        `[sitemap] Generated ${sitemapPath} (${routes.length} routes)`
      );

      // ── Fallback robots.txt ────────────────────────────────────────────
      // The hand-maintained client/public/robots.txt is copied into the output
      // dir by Vite — never overwrite it. Only emit a minimal fallback when no
      // robots.txt exists (e.g. that source file was removed).
      if (existsSync(robotsPath)) {
        console.log(
          "[sitemap] Existing robots.txt found — leaving it untouched"
        );
        return;
      }

      const robots = [
        "User-agent: *",
        "Allow: /",
        "Disallow: /dashboard",
        "Disallow: /settings",
        "Disallow: /products",
        "Disallow: /orders",
        "Disallow: /customers",
        "Disallow: /analytics",
        "Disallow: /team",
        "Disallow: /billing",
        "Disallow: /api/",
        `Sitemap: ${origin}/sitemap.xml`,
        "",
      ].join("\n");

      writeFileSync(robotsPath, robots, "utf-8");
      console.log(`[sitemap] Generated fallback ${robotsPath}`);
    },
  };
}
