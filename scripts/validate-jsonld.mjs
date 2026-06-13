#!/usr/bin/env node
/**
 * validate-jsonld.mjs — WS5 CI gate
 *
 * Tool pages inject JSON-LD at runtime via PageHead + react-helmet-async, so
 * we validate the TypeScript source rather than built HTML. Catches structural
 * regressions (missing @type, empty FAQS, absent applicationCategory) before
 * they ship.
 *
 * Checks each required tools/*.tsx for:
 *   • const jsonLd array declared
 *   • "@context": "https://schema.org" present
 *   • "@type": "WebApplication" block with applicationCategory
 *   • "@type": "FAQPage" block with mainEntity mapped from a FAQS array
 *   • FAQS array is non-empty (>20 chars of content)
 *
 * Usage:  node scripts/validate-jsonld.mjs
 * Exit 1 on any failure, 0 on success.
 */

import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const TOOLS_DIR = resolve(process.cwd(), "client/src/pages/tools");

const REQUIRED_TOOLS = [
  "MileageCalculator.tsx",
  "QuarterlyTaxEstimator.tsx",
  "EarningsConsolidator.tsx",
  "ResellerBreakEven.tsx",
  "CashflowTracker.tsx",
  "SETaxCalculator.tsx",
  "GigHourlyRate.tsx",
  "TaxSetAside.tsx",
];

let failures = 0;

function check(src, label, pattern, hint) {
  if (!pattern.test(src)) {
    console.error(`  FAIL: ${label}`);
    if (hint) console.error(`        hint: ${hint}`);
    return false;
  }
  return true;
}

for (const filename of REQUIRED_TOOLS) {
  const filepath = join(TOOLS_DIR, filename);

  if (!existsSync(filepath)) {
    console.error(`FAIL [${filename}]: file not found at ${filepath}`);
    failures++;
    continue;
  }

  const src = readFileSync(filepath, "utf-8");
  console.log(`Checking ${filename}…`);

  let ok = true;

  ok =
    check(src, "const jsonLd defined", /const jsonLd\s*=\s*\[/, "add `const jsonLd = [...]` before the component") &&
    ok;
  ok =
    check(
      src,
      '"@context": "https://schema.org"',
      /"@context":\s*"https:\/\/schema\.org"/,
      'each JSON-LD block must set @context to "https://schema.org"'
    ) && ok;
  ok =
    check(
      src,
      '"@type": "WebApplication" block',
      /"@type":\s*"WebApplication"/,
      "tool pages require a WebApplication structured-data block"
    ) && ok;
  ok =
    check(
      src,
      "applicationCategory field",
      /applicationCategory:/,
      'WebApplication requires applicationCategory (e.g. "FinanceApplication")'
    ) && ok;
  ok =
    check(
      src,
      '"@type": "FAQPage" block',
      /"@type":\s*"FAQPage"/,
      "tool pages require a FAQPage structured-data block"
    ) && ok;
  // mainEntity can be driven by a shared FAQS array (preferred) or inline.
  // Either pattern is valid; we just ensure there's actual content.
  const hasMainEntityFaqs = /mainEntity:\s*FAQS\.map/.test(src);
  const hasMainEntityInline = /mainEntity:\s*\[[\s\S]{30,}/.test(src);
  if (!hasMainEntityFaqs && !hasMainEntityInline) {
    console.error("  FAIL: FAQPage.mainEntity must be non-empty (via FAQS array or inline)");
    ok = false;
  }

  // If using the shared FAQS array pattern, verify it's non-empty
  if (hasMainEntityFaqs) {
    ok =
      check(
        src,
        "FAQS array non-empty",
        /const FAQS(?:\s*:\s*Array[^=]*)?\s*=\s*\[[\s\S]{30,}/,
        "FAQS constant array must contain at least one entry"
      ) && ok;
  }

  if (ok) {
    console.log("  OK\n");
  } else {
    console.log();
    failures++;
  }
}

const passed = REQUIRED_TOOLS.length - failures;
console.log(`JSON-LD source validation: ${passed}/${REQUIRED_TOOLS.length} passed`);

if (failures > 0) process.exit(1);
