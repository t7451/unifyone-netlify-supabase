#!/usr/bin/env node
/**
 * ping-sitemaps.mjs — WS5 deploy automation
 *
 * Pings Google and Bing sitemap endpoints after every production deploy.
 * Call from Netlify build command or CI after pnpm build.
 *
 * Usage:
 *   node scripts/ping-sitemaps.mjs
 *   APP_URL=https://1commerce.online node scripts/ping-sitemaps.mjs
 *
 * Skip in non-production environments: exits 0 without pinging if
 * NETLIFY_CONTEXT != "production" (Netlify) or CI_ENVIRONMENT != "production".
 */

const siteUrl = (
  process.env.PUBLIC_APP_URL ||
  process.env.APP_URL ||
  process.env.URL ||
  "https://1commerce.online"
).replace(/\/+$/, "");

const context = process.env.NETLIFY_CONTEXT || process.env.CI_ENVIRONMENT || "production";

if (context !== "production") {
  console.log(`[sitemap-ping] Skipping — context is "${context}" (not production)`);
  process.exit(0);
}

const sitemapUrl = encodeURIComponent(`${siteUrl}/sitemap.xml`);

const PING_URLS = [
  `https://www.google.com/ping?sitemap=${sitemapUrl}`,
  `https://www.bing.com/ping?sitemap=${sitemapUrl}`,
];

let allOk = true;

for (const url of PING_URLS) {
  try {
    const resp = await fetch(url, { method: "GET", signal: AbortSignal.timeout(10_000) });
    const engine = url.includes("google") ? "Google" : "Bing";
    if (resp.ok) {
      console.log(`[sitemap-ping] ✓ ${engine} — HTTP ${resp.status}`);
    } else {
      console.warn(`[sitemap-ping] ✗ ${engine} — HTTP ${resp.status}`);
      allOk = false;
    }
  } catch (err) {
    console.warn(`[sitemap-ping] ✗ ${url} — ${err.message}`);
    allOk = false;
  }
}

// Also ping llms.txt freshness (no standard ping endpoint — just log for manual awareness)
console.log(`[sitemap-ping] llms.txt live at ${siteUrl}/llms.txt`);

// Always exit 0 — ping failures are non-critical warnings, not build errors
if (!allOk) {
  console.warn("[sitemap-ping] One or more pings failed — deploy continues normally.");
}
process.exit(0);
