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
//           { path: '/',                                        changefreq: 'weekly',  priority: 1.0 },
//           { path: '/pricing',                                changefreq: 'weekly',  priority: 0.95 },
//           { path: '/tithes',                                 changefreq: 'weekly',  priority: 0.92 },
//           { path: '/architecture',                           changefreq: 'monthly', priority: 0.92 },
//           { path: '/the-system',                             changefreq: 'monthly', priority: 0.9  },
//           { path: '/about',                                  changefreq: 'monthly', priority: 0.85 },
//           { path: '/documents',                              changefreq: 'monthly', priority: 0.85 },
//           { path: '/documents/case-studies',                 changefreq: 'monthly', priority: 0.85 },
//           { path: '/documents/integrations',                 changefreq: 'monthly', priority: 0.85 },
//           { path: '/documents/work-proof',                   changefreq: 'monthly', priority: 0.85 },
//           { path: '/blog/gig-economy-commerce-platform',     changefreq: 'monthly', priority: 0.9  },
//           { path: '/blog/multi-tenant-ecommerce-saas',       changefreq: 'monthly', priority: 0.9  },
//           { path: '/blog/manus-ai-gig-workers',              changefreq: 'monthly', priority: 0.9  },
//           { path: '/contact',                                changefreq: 'monthly', priority: 0.7  },
//           { path: '/resources',                              changefreq: 'monthly', priority: 0.75 },
//           { path: '/sovereign',                              changefreq: 'monthly', priority: 0.7  },
//           { path: '/privacy',                                changefreq: 'yearly',  priority: 0.3  },
//           { path: '/terms',                                  changefreq: 'yearly',  priority: 0.3  },
//         ],
//       }),
//     ],
//   })

import { existsSync, writeFileSync } from 'fs'
import { resolve } from 'path'

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
  const { hostname, routes } = options

  if (!hostname || !routes?.length) {
    throw new Error('[vite-plugin-sitemap] hostname and routes are required')
  }

  // Strip trailing slash from hostname
  const origin = hostname.replace(/\/+$/, '')

  return {
    name: 'vite-plugin-sitemap',
    apply: 'build',
    closeBundle() {
      const outDir = options.outDir || 'dist'
      const today = new Date().toISOString().split('T')[0]

      const sitemapPath = resolve(outDir, 'sitemap.xml')
      const robotsPath = resolve(outDir, 'robots.txt')

      // Skip generation if hand-crafted files already exist (copied from public/)
      if (existsSync(sitemapPath) && existsSync(robotsPath)) {
        console.log('[sitemap] Existing sitemap.xml and robots.txt found — skipping generation')
        return
      }

      // ── Build sitemap.xml ──────────────────────────────────────────
      const urls = routes
        .map((r) => {
          const loc = `${origin}${r.path}`
          const lastmod = r.lastmod || today
          const changefreq = r.changefreq || 'monthly'
          const priority = r.priority ?? 0.5
          return [
            '  <url>',
            `    <loc>${loc}</loc>`,
            `    <lastmod>${lastmod}</lastmod>`,
            `    <changefreq>${changefreq}</changefreq>`,
            `    <priority>${priority.toFixed(1)}</priority>`,
            '  </url>',
          ].join('\n')
        })
        .join('\n')

      const sitemap = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        urls,
        '</urlset>',
        '',
      ].join('\n')

      writeFileSync(sitemapPath, sitemap, 'utf-8')
      console.log(`[sitemap] Generated ${sitemapPath}`)

      // ── Build robots.txt ───────────────────────────────────────────
      const robots = [
        'User-agent: *',
        'Allow: /',
        '',
        `Sitemap: ${origin}/sitemap.xml`,
        '',
      ].join('\n')

      writeFileSync(robotsPath, robots, 'utf-8')
      console.log(`[sitemap] Generated ${robotsPath}`)
    },
  }
}
