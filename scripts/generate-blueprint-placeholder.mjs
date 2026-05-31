#!/usr/bin/env node
/**
 * generate-blueprint-placeholder.mjs
 *
 * Builds a minimal one-page PDF placeholder for the Cathedral Blueprint
 * lead magnet. The output is committed to the repo at
 * server/assets/cathedral-blueprint.pdf and is bundled into the Netlify
 * function via `included_files = ["server/**"]`.
 *
 * Replace the file with the real blueprint PDF before launch. To regenerate
 * the placeholder, run:
 *
 *   node scripts/generate-blueprint-placeholder.mjs
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(
  __dirname,
  "..",
  "server",
  "assets",
  "cathedral-blueprint.pdf"
);

// Each text line: [fontSize, yOffsetFromTop, text]
const lines = [
  [24, 80, "UnifyOne — Cathedral Blueprint"],
  [12, 130, "The architecture guide behind the platform."],
  [12, 160, ""],
  [12, 185, "1. Multi-tenant data model"],
  [12, 210, "2. Sequential construction (Six Pillars)"],
  [12, 235, "3. AI routing via Vercel AI Gateway + Kai"],
  [12, 260, "4. Gig income intelligence layer"],
  [12, 285, "5. Webhook-first integrations (Stripe, Shopify, PayPal, Square)"],
  [12, 310, ""],
  [10, 350, "This is a placeholder. The full blueprint PDF will be"],
  [10, 365, "attached to your welcome email."],
  [10, 400, "© PNW Enterprises / 1Commerce LLC"],
];

// Build the content stream
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_LEFT = 72;

const contentOps = ["BT"];
let lastSize = null;
for (const [size, yFromTop, text] of lines) {
  if (size !== lastSize) {
    contentOps.push(`/F1 ${size} Tf`);
    lastSize = size;
  }
  const y = PAGE_HEIGHT - yFromTop;
  // Escape parens and backslashes in the text
  const safe = text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
  contentOps.push(`1 0 0 1 ${MARGIN_LEFT} ${y} Tm (${safe}) Tj`);
}
contentOps.push("ET");
const contentStream = contentOps.join("\n");

// Assemble PDF objects
const objects = [
  // 1: Catalog
  "<</Type /Catalog /Pages 2 0 R>>",
  // 2: Pages
  "<</Type /Pages /Kids [3 0 R] /Count 1>>",
  // 3: Page
  `<</Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents 4 0 R /Resources <</Font <</F1 5 0 R>>>>>>`,
  // 4: Content stream
  `<</Length ${contentStream.length}>>\nstream\n${contentStream}\nendstream`,
  // 5: Font
  "<</Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding>>",
];

// Build the body with xref offsets
let body = "%PDF-1.4\n%\xff\xff\xff\xff\n";
const offsets = [];
for (let i = 0; i < objects.length; i++) {
  offsets.push(Buffer.byteLength(body, "binary"));
  body += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
}

const xrefOffset = Buffer.byteLength(body, "binary");
let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
for (const off of offsets) {
  xref += `${off.toString().padStart(10, "0")} 00000 n \n`;
}

const trailer = `trailer\n<</Size ${objects.length + 1} /Root 1 0 R>>\nstartxref\n${xrefOffset}\n%%EOF\n`;

const pdf = Buffer.from(body + xref + trailer, "binary");

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, pdf);
console.log(`Wrote ${pdf.length} bytes to ${outPath}`);
