#!/usr/bin/env node
/**
 * check-sitemap-routes.mjs — WS5 CI gate
 *
 * Parses dist/public/sitemap.xml after `pnpm build` and verifies that every
 * public URL has a corresponding prerendered HTML file on disk.
 *
 * The prerender plugin (vite-plugin-prerender-seo.ts) emits flat .html files
 * (NOT directory/index.html) so Netlify pretty_urls keeps URLs trailing-slash-free:
 *   /pricing       → dist/public/pricing.html
 *   /tools/cashflow-tracker → dist/public/tools/cashflow-tracker.html
 *   /              → dist/public/index.html
 *
 * Auth-gated and dynamic app routes are skipped — they're served by the SPA
 * fallback (index.html) and don't need individual prerendered files.
 *
 * Run AFTER `pnpm build`. Exit 1 if any sitemapped public URL lacks an HTML file.
 */

import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const DIST = resolve(process.cwd(), "dist/public");

// Auth-gated / app shell routes that live behind the SPA fallback.
const SKIP_RE =
  /^\/(dashboard|settings|admin|kai|team|affiliates|analytics|shop|products|orders|customers|billing|integrations|webhooks|developer|notifications|gamification|governance|master-control|sovereign|design-system|demo)/;

const sitemapPath = join(DIST, "sitemap.xml");

if (!existsSync(sitemapPath)) {
  console.error(
    "FAIL: dist/public/sitemap.xml not found — run `pnpm build` first"
  );
  process.exit(1);
}

const xml = readFileSync(sitemapPath, "utf-8");
const urlRegex = /<loc>(.*?)<\/loc>/g;
const urls = [];
let m;
while ((m = urlRegex.exec(xml)) !== null) urls.push(m[1].trim());

if (urls.length === 0) {
  console.error("FAIL: sitemap.xml contains no <loc> entries");
  process.exit(1);
}

console.log(`Checking ${urls.length} sitemap URLs against dist/public…\n`);

let failures = 0;
let skipped = 0;

for (const url of urls) {
  let urlPath;
  try {
    urlPath = new URL(url).pathname.replace(/\/+$/, "") || "/";
  } catch {
    console.error(`FAIL: malformed sitemap URL — ${url}`);
    failures++;
    continue;
  }

  if (SKIP_RE.test(urlPath)) {
    skipped++;
    continue;
  }

  // Primary: flat .html file (what the prerender plugin emits)
  const flatHtml =
    urlPath === "/" ? join(DIST, "index.html") : join(DIST, `${urlPath}.html`);

  // Fallback: directory index.html (not expected but harmless to check)
  const dirIndex = join(DIST, urlPath, "index.html");

  if (existsSync(flatHtml)) {
    console.log(`OK   ${urlPath}`);
  } else if (existsSync(dirIndex)) {
    console.log(`OK   ${urlPath}  (dir/index.html)`);
  } else {
    const rel = flatHtml.replace(DIST, "dist/public");
    console.error(`FAIL ${urlPath}  — expected ${rel}`);
    failures++;
  }
}

const checked = urls.length - skipped;
console.log(
  `\nSitemap coverage: ${checked - failures}/${checked} OK  (${skipped} app-routes skipped, ${failures} missing)`
);

if (failures > 0) process.exit(1);
