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
//         routes: [
//           { path: '/', changefreq: 'weekly', priority: 1.0, lastmod: '2026-05-06' },
//           { path: '/pricing', changefreq: 'monthly', priority: 0.9, lastmod: '2026-05-06' },
//           { path: '/architecture', changefreq: 'monthly', priority: 0.6, lastmod: '2026-05-06' },
//           { path: '/the-system', changefreq: 'monthly', priority: 0.6, lastmod: '2026-05-06' },
//           { path: '/manus-ai', changefreq: 'monthly', priority: 0.6, lastmod: '2026-05-06' },
//           { path: '/tithes', changefreq: 'monthly', priority: 0.6, lastmod: '2026-05-06' },
//           { path: '/blog', changefreq: 'monthly', priority: 0.8, lastmod: '2026-05-06' },
//           { path: '/blog/gig-ecommerce', changefreq: 'monthly', priority: 0.8, lastmod: '2026-05-06' },
//           { path: '/blog/multi-tenant', changefreq: 'monthly', priority: 0.8, lastmod: '2026-05-06' },
//           { path: '/blog/manus-ai', changefreq: 'monthly', priority: 0.8, lastmod: '2026-05-06' },
//           { path: '/privacy', changefreq: 'monthly', priority: 0.6, lastmod: '2026-05-06' },
//           { path: '/terms', changefreq: 'monthly', priority: 0.6, lastmod: '2026-05-06' },
//           { path: '/themes', changefreq: 'monthly', priority: 0.6, lastmod: '2026-05-06' },
//           { path: '/docs-chat', changefreq: 'monthly', priority: 0.6, lastmod: '2026-05-06' },
//           { path: '/resources', changefreq: 'monthly', priority: 0.6, lastmod: '2026-05-06' },
//           { path: '/sovereign', changefreq: 'monthly', priority: 0.6, lastmod: '2026-05-06' },
//           { path: '/login', changefreq: 'monthly', priority: 0.6, lastmod: '2026-05-06' },
//           { path: '/register', changefreq: 'monthly', priority: 0.6, lastmod: '2026-05-06' },
//         ],
//       }),
//     ],
//   })

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
 * @property {string}       [outDir]  — Override output directory; defaults to Vite's build.outDir
 */

/**
 * Vite plugin that generates sitemap.xml and robots.txt at build time.
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

      // Skip generation if hand-crafted files already exist (copied from public/)
      if (existsSync(sitemapPath) && existsSync(robotsPath)) {
        console.log(
          "[sitemap] Existing sitemap.xml and robots.txt found — skipping generation"
        );
        return;
      }

      // ── Build sitemap.xml ──────────────────────────────────────────
      const urls = routes
        .map(r => {
          const loc = `${origin}${r.path}`;
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
      console.log(`[sitemap] Generated ${sitemapPath}`);

      // ── Build robots.txt ───────────────────────────────────────────
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
      console.log(`[sitemap] Generated ${robotsPath}`);
    },
  };
}
