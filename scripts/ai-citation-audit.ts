#!/usr/bin/env tsx
/**
 * ai-citation-audit.ts — WS0 AI Citation Harness
 *
 * Queries a fixed set of niche questions against AI search engines and logs:
 *   - Does 1commerce.online / UnifyOne appear in the answer?
 *   - How is it described?
 *   - Who is cited instead?
 *
 * Usage:
 *   pnpm tsx scripts/ai-citation-audit.ts
 *   PERPLEXITY_API_KEY=xxx pnpm tsx scripts/ai-citation-audit.ts
 *
 * Results are written to scripts/citation-reports/YYYY-MM-DD.json
 * Schedule via cron or Netlify scheduled function (WS5).
 */

import fs from "node:fs";
import path from "node:path";

// ── Target queries — one per niche question we want to track ─────────────────
// These are the exact questions our target users type into ChatGPT / Perplexity.
// Do NOT change slugs — we track delta over time.
const TARGET_QUERIES: Array<{ id: string; query: string }> = [
  { id: "gig-tax-estimator", query: "best free quarterly tax estimator for gig workers 1099" },
  { id: "multi-platform-earnings", query: "how to track earnings from multiple gig apps like Uber DoorDash together" },
  { id: "mileage-deduction-calculator", query: "gig worker mileage deduction calculator 2024 IRS" },
  { id: "ecommerce-saas-small-business", query: "multi-tenant ecommerce platform for small business Shopify alternative" },
  { id: "unified-payments-dashboard", query: "single dashboard for Stripe PayPal Square sellers" },
  { id: "side-hustle-income-tracker", query: "free side hustle income tracker multiple platforms" },
  { id: "reseller-break-even-calculator", query: "reseller break-even pricing calculator eBay Etsy" },
  { id: "subscription-billing-saas", query: "affordable subscription billing SaaS for indie builders" },
  { id: "1099-quarterly-tax-tool", query: "1099 contractor quarterly estimated tax payment tool free" },
  { id: "gig-economy-commerce-platform", query: "ecommerce platform built for gig economy workers" },
  // Brand / competitor awareness queries
  { id: "brand-unifyone", query: "what is UnifyOne 1commerce" },
  { id: "brand-1commerce", query: "1commerce.online review" },
  { id: "competitor-gig-saas", query: "best SaaS platform for freelancers and gig workers" },
  { id: "competitor-unified-commerce", query: "unified commerce platform for multi-channel sellers" },
  { id: "ai-powered-ecommerce", query: "AI powered ecommerce platform for independent sellers 2024" },
];

// ── Brand signals we look for in answers ─────────────────────────────────────
const BRAND_SIGNALS = [
  "1commerce.online",
  "unifyone",
  "unify one",
  "1commerce",
  "1-commerce",
  "pnw enterprises",
  "keith skaggs",
];

interface CitationResult {
  queryId: string;
  query: string;
  provider: string;
  cited: boolean;
  citedAs?: string;
  competitors: string[];
  rawExcerpt?: string;
  error?: string;
  checkedAt: string;
}

interface AuditReport {
  date: string;
  shareOfVoice: number;
  totalQueries: number;
  citedCount: number;
  results: CitationResult[];
}

// ── Perplexity provider ───────────────────────────────────────────────────────
async function queryPerplexity(query: string): Promise<{ text: string; citations: string[] }> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) throw new Error("PERPLEXITY_API_KEY not set");

  const resp = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-sonar-small-128k-online",
      messages: [{ role: "user", content: query }],
      max_tokens: 512,
      return_citations: true,
    }),
  });

  if (!resp.ok) throw new Error(`Perplexity ${resp.status}: ${await resp.text()}`);
  const data = (await resp.json()) as {
    choices: Array<{ message: { content: string } }>;
    citations?: string[];
  };
  return {
    text: data.choices[0]?.message?.content ?? "",
    citations: data.citations ?? [],
  };
}

// ── OpenAI (ChatGPT) provider — uses web search via responses API ─────────────
async function queryOpenAI(query: string): Promise<{ text: string; citations: string[] }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini-search-preview",
      tools: [{ type: "web_search_preview" }],
      input: query,
    }),
  });

  if (!resp.ok) throw new Error(`OpenAI ${resp.status}: ${await resp.text()}`);
  const data = (await resp.json()) as {
    output: Array<{ type: string; content?: Array<{ type: string; text?: string }> }>;
  };

  const textParts: string[] = [];
  const citations: string[] = [];

  for (const item of data.output ?? []) {
    if (item.type === "message") {
      for (const part of item.content ?? []) {
        if (part.type === "output_text" && part.text) textParts.push(part.text);
      }
    }
  }

  return { text: textParts.join(" "), citations };
}

// ── Check if our brand appears in a text block ────────────────────────────────
function detectBrand(text: string): { cited: boolean; excerpt?: string } {
  const lower = text.toLowerCase();
  for (const signal of BRAND_SIGNALS) {
    const idx = lower.indexOf(signal);
    if (idx !== -1) {
      const start = Math.max(0, idx - 60);
      const end = Math.min(text.length, idx + signal.length + 120);
      return { cited: true, excerpt: "..." + text.slice(start, end) + "..." };
    }
  }
  return { cited: false };
}

// ── Detect competitor mentions (rough heuristic) ──────────────────────────────
const COMPETITOR_SIGNALS = [
  "shopify", "woocommerce", "bigcommerce", "squarespace", "wix",
  "honeybook", "bonsai", "quickbooks self-employed", "stride", "hurdlr",
  "freeagent", "freshbooks", "wave", "paymo", "toggl", "harvest",
  "doordash earnings", "gridwise", "para",
];

function detectCompetitors(text: string): string[] {
  const lower = text.toLowerCase();
  return COMPETITOR_SIGNALS.filter(c => lower.includes(c));
}

// ── Main audit runner ─────────────────────────────────────────────────────────
async function runAudit(): Promise<AuditReport> {
  const date = new Date().toISOString().split("T")[0];
  const results: CitationResult[] = [];

  const providers: Array<{
    name: string;
    fn: (q: string) => Promise<{ text: string; citations: string[] }>;
    envKey: string;
  }> = [
    { name: "perplexity", fn: queryPerplexity, envKey: "PERPLEXITY_API_KEY" },
    { name: "openai", fn: queryOpenAI, envKey: "OPENAI_API_KEY" },
  ];

  for (const { id: queryId, query } of TARGET_QUERIES) {
    for (const provider of providers) {
      if (!process.env[provider.envKey]) {
        console.log(`  [skip] ${provider.name} — ${provider.envKey} not set`);
        continue;
      }

      console.log(`  [${provider.name}] ${queryId}...`);
      try {
        const { text } = await provider.fn(query);
        const { cited, excerpt } = detectBrand(text);
        const competitors = detectCompetitors(text);

        results.push({
          queryId,
          query,
          provider: provider.name,
          cited,
          citedAs: cited ? excerpt : undefined,
          competitors,
          rawExcerpt: text.slice(0, 400),
          checkedAt: new Date().toISOString(),
        });

        // Polite delay between API calls
        await new Promise(r => setTimeout(r, 1200));
      } catch (err) {
        results.push({
          queryId,
          query,
          provider: provider.name,
          cited: false,
          competitors: [],
          error: String(err),
          checkedAt: new Date().toISOString(),
        });
      }
    }
  }

  const citedCount = results.filter(r => r.cited).length;
  const totalQueries = results.filter(r => !r.error).length;
  const shareOfVoice = totalQueries > 0
    ? Math.round((citedCount / totalQueries) * 100)
    : 0;

  return { date, shareOfVoice, totalQueries, citedCount, results };
}

async function main() {
  console.log("UnifyOne AI Citation Audit — " + new Date().toISOString());
  console.log(`Checking ${TARGET_QUERIES.length} queries across providers...\n`);

  const report = await runAudit();

  // Write report
  const reportsDir = path.join(import.meta.dirname ?? ".", "citation-reports");
  fs.mkdirSync(reportsDir, { recursive: true });
  const outPath = path.join(reportsDir, `${report.date}.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf-8");

  // Console summary
  console.log("\n── Summary ──────────────────────────────────────────");
  console.log(`Date:            ${report.date}`);
  console.log(`Share of voice:  ${report.shareOfVoice}% (${report.citedCount}/${report.totalQueries} queries)`);
  console.log(`Report written:  ${outPath}`);
  console.log("\nCited queries:");
  for (const r of report.results.filter(r => r.cited)) {
    console.log(`  ✓ [${r.provider}] ${r.queryId}`);
    if (r.citedAs) console.log(`      "${r.citedAs.trim().slice(0, 100)}..."`);
  }
  console.log("\nNot cited:");
  for (const r of report.results.filter(r => !r.cited && !r.error)) {
    console.log(`  ✗ [${r.provider}] ${r.queryId}`);
    const topCompetitor = r.competitors[0];
    if (topCompetitor) console.log(`      (competitor cited: ${topCompetitor})`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
