#!/usr/bin/env node
/**
 * M3: structural + optional live eval of PDX golden routes.
 *
 *   node scripts/eval-pdx-golden.mjs              # structure only
 *   BASE_URL=https://1commerce.online node scripts/eval-pdx-golden.mjs --live
 *
 * Live mode hits the public tRPC getRoute for a sample of routes (quota-aware).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(
  join(__dirname, "../server/routers/routePulse/pdxGoldenRoutes.ts"),
  "utf8"
);

const ids = [...src.matchAll(/id: ["'](pdx-\d+)["']/g)].map(m => m[1]);
const labels = [...src.matchAll(/label: ["']([^"']+)["']/g)].map(m => m[1]);
const origins = [...src.matchAll(/origin: ["']([^"']+)["']/g)].map(m => m[1]);

console.log(`Golden set: ${ids.length} routes, ${new Set(labels).size} labels`);
if (ids.length < 50) {
  console.error(`Expected >= 50 routes, got ${ids.length}`);
  process.exit(1);
}
const dups = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dups.length) {
  console.error("Duplicate ids:", dups);
  process.exit(1);
}
console.log("Labels:", [...new Set(labels)].sort().join(", "));
console.log("Structure OK");

const live = process.argv.includes("--live");
if (!live) process.exit(0);

const base = (process.env.BASE_URL || "https://1commerce.online").replace(/\/+$/, "");
const sample = origins.slice(0, 5);
console.log(`\nLive smoke against ${base} (${sample.length} routes)...`);

for (let i = 0; i < sample.length; i++) {
  const origin = sample[i];
  const destMatch = src.match(
    new RegExp(`origin: "${origin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[\s\S]*?destination: "([^"]+)"`)
  );
  const destination = destMatch?.[1];
  if (!destination) continue;
  const input = encodeURIComponent(
    JSON.stringify({
      "0": {
        json: {
          origin,
          destination,
          preference: "balanced",
          stops: [],
          optimizeStops: true,
        },
      },
    })
  );
  const url = `${base}/api/trpc/routePulse.getRoute?batch=1&input=${input}`;
  try {
    const res = await fetch(url);
    const text = await res.text();
    if (!res.ok) {
      console.log(`  [${i + 1}] HTTP ${res.status} ${origin.slice(0, 40)}`);
      continue;
    }
    const body = JSON.parse(text);
    const result = body?.[0]?.result?.data?.json ?? body?.[0]?.result?.data;
    const min = result?.route
      ? Math.round((result.route.liveDurationS ?? result.route.duration) / 60)
      : null;
    const flow = result?.route?.flow?.samples ?? 0;
    const g = result?.grounding;
    console.log(
      `  [${i + 1}] ${min ?? "?"} min · flow ${flow} · tt ${g?.tomtomIncidents ?? 0} · ${origin.slice(0, 28)} → ${destination.slice(0, 28)}`
    );
  } catch (e) {
    console.log(`  [${i + 1}] error: ${e.message}`);
  }
}
