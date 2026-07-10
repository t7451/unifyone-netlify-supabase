#!/usr/bin/env node
/**
 * check-robots-sitemap-sync.mjs — SEO gate
 *
 * Guards the invariant documented in vite.config.ts: the build-time sitemap
 * filter (`SITEMAP_DISALLOW_PREFIXES`) must mirror the `Disallow` list in the
 * hand-maintained `client/public/robots.txt`, so the generated sitemap can
 * never point Googlebot at a URL that robots.txt forbids ("Blocked by
 * robots.txt" in Search Console).
 *
 * These two lists are edited by hand in separate files and silently drift
 * (that drift is exactly what PR #413 fixed). This check fails CI whenever a
 * `Disallow` prefix in robots.txt is NOT covered by the sitemap filter — the
 * dangerous direction, because a future ROUTE_SEO/SEO page under that prefix
 * would be written into the sitemap while blocked by robots.txt.
 *
 * The reverse (a filter prefix not present in robots.txt) is only harmless
 * over-filtering, so it is reported as a warning, not a failure.
 *
 * No build required — parses source files directly. Exit 1 on drift.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();
const ROBOTS = resolve(ROOT, "client/public/robots.txt");
const VITE_CONFIG = resolve(ROOT, "vite.config.ts");

/** Strip a single trailing slash so "/admin/" and "/admin" compare equal. */
function normalize(p) {
  const trimmed = p.trim().replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

/**
 * Collect Disallow path prefixes from the `User-agent: *` group of robots.txt.
 * Bot-specific groups (the AI-crawler allowlists above it) are ignored so a
 * future per-bot rule can't over-constrain the sitemap filter.
 */
function parseRobotsDisallow(text) {
  const lines = text.split(/\r?\n/);
  const prefixes = new Set();
  let inStar = false;

  for (const raw of lines) {
    const line = raw.replace(/#.*$/, "").trim();
    if (line === "") continue;

    const uaMatch = line.match(/^User-agent:\s*(.+)$/i);
    if (uaMatch) {
      inStar = uaMatch[1].trim() === "*";
      continue;
    }

    if (!inStar) continue;

    const disMatch = line.match(/^Disallow:\s*(\S+)$/i);
    if (disMatch) {
      const path = normalize(disMatch[1]);
      if (path !== "/") prefixes.add(path); // "Disallow: /" would block the whole site — not a prefix rule
    }
  }
  return prefixes;
}

/** Extract the string entries of the SITEMAP_DISALLOW_PREFIXES array literal. */
function parseSitemapDisallow(text) {
  const start = text.indexOf("const SITEMAP_DISALLOW_PREFIXES");
  if (start === -1) {
    console.error(
      "FAIL: could not find `const SITEMAP_DISALLOW_PREFIXES` in vite.config.ts"
    );
    process.exit(1);
  }
  const end = text.indexOf("];", start);
  if (end === -1) {
    console.error(
      "FAIL: could not find the end of the SITEMAP_DISALLOW_PREFIXES array"
    );
    process.exit(1);
  }
  const block = text.slice(start, end);
  const prefixes = new Set();
  // Line-anchored: only capture one-per-line quoted array entries, so a future
  // inline comment containing a quoted string can't inject a spurious prefix.
  for (const m of block.matchAll(/^\s*"([^"]+)",?\s*$/gm))
    prefixes.add(normalize(m[1]));
  return prefixes;
}

const robots = parseRobotsDisallow(readFileSync(ROBOTS, "utf-8"));
const sitemap = parseSitemapDisallow(readFileSync(VITE_CONFIG, "utf-8"));

const missingFromFilter = [...robots].filter(p => !sitemap.has(p)).sort();
const extraInFilter = [...sitemap].filter(p => !robots.has(p)).sort();

console.log(
  `robots.txt Disallow prefixes (User-agent: *): ${robots.size}\n` +
    `SITEMAP_DISALLOW_PREFIXES entries:            ${sitemap.size}\n`
);

if (extraInFilter.length > 0) {
  console.warn(
    "WARN: filter-only prefixes (in SITEMAP_DISALLOW_PREFIXES but not robots.txt).\n" +
      "      Harmless over-filtering, but confirm it is intentional:\n" +
      extraInFilter.map(p => `      - ${p}`).join("\n") +
      "\n"
  );
}

if (missingFromFilter.length > 0) {
  console.error(
    "FAIL: robots.txt Disallow prefixes NOT covered by SITEMAP_DISALLOW_PREFIXES.\n" +
      "      A sitemap URL under one of these would be blocked by robots.txt.\n" +
      "      Add each to SITEMAP_DISALLOW_PREFIXES in vite.config.ts:\n" +
      missingFromFilter.map(p => `      - ${p}`).join("\n")
  );
  process.exit(1);
}

console.log(
  "OK: every robots.txt Disallow prefix is covered by the sitemap filter."
);
