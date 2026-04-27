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
//           // ── Homepage ──────────────────────────────────────────────────
//           { path: '/',                                        changefreq: 'weekly',  priority: 1.0,  lastmod: '2025-07-21' },
//
//           // ── Core Public Pages ──────────────────────────────────────────
//           { path: '/pricing',                                changefreq: 'weekly',  priority: 0.95, lastmod: '2025-07-21' },
//           { path: '/tithes',                                 changefreq: 'weekly',  priority: 0.92, lastmod: '2025-07-21' },
//           { path: '/architecture',                           changefreq: 'monthly', priority: 0.92, lastmod: '2025-07-21' },
//           { path: '/the-system',                             changefreq: 'monthly', priority: 0.9,  lastmod: '2025-07-21' },
//           { path: '/about',                                  changefreq: 'monthly', priority: 0.85, lastmod: '2025-07-21' },
//           { path: '/contact',                                changefreq: 'monthly', priority: 0.7,  lastmod: '2025-07-21' },
//           { path: '/sovereign',                              changefreq: 'monthly', priority: 0.7,  lastmod: '2025-07-21' },
//           { path: '/governance',                             changefreq: 'monthly', priority: 0.7,  lastmod: '2025-07-21' },
//           { path: '/resources',                              changefreq: 'monthly', priority: 0.75, lastmod: '2025-07-21' },
//
//           // ── Legal ──────────────────────────────────────────────────────
//           { path: '/privacy',                                changefreq: 'yearly',  priority: 0.3,  lastmod: '2025-07-21' },
//           { path: '/terms',                                  changefreq: 'yearly',  priority: 0.3,  lastmod: '2025-07-21' },
//
//           // ── Documentation ──────────────────────────────────────────────
//           { path: '/documents',                              changefreq: 'monthly', priority: 0.85, lastmod: '2025-07-21' },
//           { path: '/documents/case-studies',                 changefreq: 'monthly', priority: 0.85, lastmod: '2025-07-21' },
//           { path: '/documents/integrations',                 changefreq: 'monthly', priority: 0.85, lastmod: '2025-07-21' },
//           { path: '/documents/work-proof',                   changefreq: 'monthly', priority: 0.85, lastmod: '2025-07-21' },
//
//           // ── Feature Pages (public-facing) ──────────────────────────────
//           { path: '/docs-chat',                              changefreq: 'monthly', priority: 0.8,  lastmod: '2025-07-21' },
//           { path: '/video-production',                       changefreq: 'monthly', priority: 0.75, lastmod: '2025-07-21' },
//           { path: '/marketing/ad-copy',                      changefreq: 'monthly', priority: 0.75, lastmod: '2025-07-21' },
//           { path: '/themes',                                  changefreq: 'monthly', priority: 0.65, lastmod: '2025-07-21' },
//
//           // ── Blog / Content Marketing ───────────────────────────────────
//           { path: '/blog/gig-economy-commerce-platform',     changefreq: 'monthly', priority: 0.9,  lastmod: '2025-07-21' },
//           { path: '/blog/multi-tenant-ecommerce-saas',       changefreq: 'monthly', priority: 0.9,  lastmod: '2025-07-21' },
//           { path: '/blog/manus-ai-gig-workers',              changefreq: 'monthly', priority: 0.9,  lastmod: '2025-07-21' },
//           { path: '/blog/digital-retail-guide',              changefreq: 'monthly', priority: 0.9,  lastmod: '2025-07-21' },
//
//           // ── SEO Landing Pages ──────────────────────────────────────────
//           { path: '/seo',                                    changefreq: 'weekly',  priority: 0.9,  lastmod: '2025-07-21' },
//           { path: '/seo/unifyone',                           changefreq: 'weekly',  priority: 0.95, lastmod: '2025-07-21' },
//           { path: '/seo/unifyone-solutions',                 changefreq: 'weekly',  priority: 0.92, lastmod: '2025-07-21' },
//           { path: '/seo/unifyone-platform',                  changefreq: 'weekly',  priority: 0.9,  lastmod: '2025-07-21' },
//           { path: '/seo/unifyone-commerce',                  changefreq: 'weekly',  priority: 0.9,  lastmod: '2025-07-21' },
//           { path: '/seo/unifyone-login',                     changefreq: 'monthly', priority: 0.85, lastmod: '2025-07-21' },
//           { path: '/seo/unifyone-pricing',                   changefreq: 'weekly',  priority: 0.9,  lastmod: '2025-07-21' },
//           { path: '/seo/unifyone-reviews',                   changefreq: 'monthly', priority: 0.85, lastmod: '2025-07-21' },
//           { path: '/seo/unifone',                            changefreq: 'monthly', priority: 0.85, lastmod: '2025-07-21' },
//           { path: '/seo/1-commerce',                         changefreq: 'weekly',  priority: 0.95, lastmod: '2025-07-21' },
//           { path: '/seo/1commerce',                          changefreq: 'weekly',  priority: 0.95, lastmod: '2025-07-21' },
//           { path: '/seo/1commerce-llc',                      changefreq: 'weekly',  priority: 0.92, lastmod: '2025-07-21' },
//           { path: '/seo/1commerce-solutions',                changefreq: 'weekly',  priority: 0.9,  lastmod: '2025-07-21' },
//           { path: '/seo/1commerce-login',                    changefreq: 'monthly', priority: 0.85, lastmod: '2025-07-21' },
//           { path: '/seo/1commerce-pnw',                      changefreq: 'monthly', priority: 0.8,  lastmod: '2025-07-21' },
//           { path: '/seo/onecommerc',                         changefreq: 'monthly', priority: 0.85, lastmod: '2025-07-21' },
//           { path: '/seo/onecommerce',                        changefreq: 'weekly',  priority: 0.9,  lastmod: '2025-07-21' },
//           { path: '/seo/onecommerce-platform',               changefreq: 'monthly', priority: 0.85, lastmod: '2025-07-21' },
//           { path: '/seo/onecommerce-solutions',              changefreq: 'monthly', priority: 0.85, lastmod: '2025-07-21' },
//           { path: '/seo/pnw-enterprises',                    changefreq: 'monthly', priority: 0.85, lastmod: '2025-07-21' },
//           { path: '/seo/pnw-1commerce',                      changefreq: 'monthly', priority: 0.8,  lastmod: '2025-07-21' },
//           { path: '/seo/unifyone-vs-shopify',                changefreq: 'monthly', priority: 0.85, lastmod: '2025-07-21' },
//           { path: '/seo/unifyone-vs-squarespace',            changefreq: 'monthly', priority: 0.8,  lastmod: '2025-07-21' },
//           { path: '/seo/unifyone-multi-tenant-commerce',     changefreq: 'monthly', priority: 0.85, lastmod: '2025-07-21' },
//           { path: '/seo/unifyone-gig-economy',               changefreq: 'monthly', priority: 0.85, lastmod: '2025-07-21' },
//           { path: '/seo/unifyone-ai-commerce',               changefreq: 'monthly', priority: 0.85, lastmod: '2025-07-21' },
//           { path: '/seo/unifyone-stripe',                    changefreq: 'monthly', priority: 0.8,  lastmod: '2025-07-21' },
//           { path: '/seo/unifyone-paypal',                    changefreq: 'monthly', priority: 0.8,  lastmod: '2025-07-21' },
//           { path: '/seo/unifyone-shopify-integration',       changefreq: 'monthly', priority: 0.85, lastmod: '2025-07-21' },
//           { path: '/seo/unifyone-square-integration',        changefreq: 'monthly', priority: 0.8,  lastmod: '2025-07-21' },
//           { path: '/seo/unifyone-affiliates',                changefreq: 'monthly', priority: 0.8,  lastmod: '2025-07-21' },
//           { path: '/seo/unifyone-analytics',                 changefreq: 'monthly', priority: 0.8,  lastmod: '2025-07-21' },
//           { path: '/seo/unifyone-subscription-billing',      changefreq: 'monthly', priority: 0.8,  lastmod: '2025-07-21' },
//           { path: '/seo/unifyone-gamification',              changefreq: 'monthly', priority: 0.75, lastmod: '2025-07-21' },
//           { path: '/seo/unifyone-free-trial',                changefreq: 'weekly',  priority: 0.9,  lastmod: '2025-07-21' },
//           { path: '/seo/unifyone-enterprise',                changefreq: 'monthly', priority: 0.85, lastmod: '2025-07-21' },
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
        "",
        `Sitemap: ${origin}/sitemap.xml`,
        "",
      ].join("\n");

      writeFileSync(robotsPath, robots, "utf-8");
      console.log(`[sitemap] Generated ${robotsPath}`);
    },
  };
}
