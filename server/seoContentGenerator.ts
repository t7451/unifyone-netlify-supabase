/**
 * seoContentGenerator.ts
 *
 * AI-powered SEO content generation service.
 *
 * Uses invokeLLM to generate structured SEO-optimised content
 * (blog posts, SEO landing pages, FAQ expansions) and persists results
 * to the `seo_content_jobs` table. Called by:
 *  - netlify/functions/seo-content-generator-scheduled.mts (weekly cron)
 *  - server/routers/seo.ts triggerGeneration (manual admin invocation)
 */

import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { seoContentJobs } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

// ─── Topic Strategy ──────────────────────────────────────────────────────────
// Rotating pool of SEO topics and target keywords. The cron job picks N topics
// per run in round-robin order based on how many jobs already exist in the DB.

export interface SeoTopic {
  slug: string;
  type: "blog_post" | "seo_landing" | "faq_expansion";
  topic: string;
  targetKeywords: string[];
}

export const SEO_TOPIC_POOL: SeoTopic[] = [
  // ── Comparison / competitor displacement ─────────────────────────────────
  {
    slug: "unifyone-vs-woocommerce",
    type: "seo_landing",
    topic:
      "UnifyOne vs WooCommerce: which platform is better for multi-tenant commerce operators",
    targetKeywords: [
      "UnifyOne vs WooCommerce",
      "WooCommerce alternative",
      "multi-tenant WooCommerce",
      "1Commerce WooCommerce",
      "UnifyOne",
    ],
  },
  {
    slug: "unifyone-vs-bigcommerce",
    type: "seo_landing",
    topic:
      "UnifyOne vs BigCommerce: comparing AI-native SaaS against traditional hosted commerce",
    targetKeywords: [
      "UnifyOne vs BigCommerce",
      "BigCommerce alternative",
      "1Commerce BigCommerce",
      "AI commerce platform",
    ],
  },
  {
    slug: "unifyone-vs-wix",
    type: "seo_landing",
    topic:
      "UnifyOne vs Wix for ecommerce: why gig operators and agency owners outgrow Wix fast",
    targetKeywords: [
      "UnifyOne vs Wix",
      "Wix ecommerce alternative",
      "better than Wix",
      "1Commerce Wix",
    ],
  },
  // ── Feature / module depth ────────────────────────────────────────────────
  {
    slug: "unifyone-gig-worker-tax-tracker",
    type: "blog_post",
    topic:
      "How UnifyOne Money Manager automates IRS mileage deductions for gig economy workers in 2026",
    targetKeywords: [
      "gig worker tax tracker",
      "IRS mileage deduction 2026",
      "DoorDash tax deductions",
      "Uber Eats tax tracker",
      "UnifyOne Money Manager",
      "1Commerce gig",
    ],
  },
  {
    slug: "multi-tenant-ecommerce-architecture",
    type: "blog_post",
    topic:
      "What is multi-tenant ecommerce architecture and why it matters for agencies running multiple Shopify stores",
    targetKeywords: [
      "multi-tenant ecommerce",
      "ecommerce multi-tenancy",
      "Shopify multi-tenant",
      "agency ecommerce platform",
      "UnifyOne multi-tenant",
    ],
  },
  {
    slug: "ai-commerce-platform-2026",
    type: "blog_post",
    topic:
      "The rise of AI-native commerce platforms in 2026: how UnifyOne integrates Kai AI into every merchant workflow",
    targetKeywords: [
      "AI commerce platform 2026",
      "AI ecommerce assistant",
      "Kai AI",
      "UnifyOne AI",
      "1Commerce AI",
    ],
  },
  {
    slug: "unifyone-affiliate-program",
    type: "seo_landing",
    topic:
      "UnifyOne affiliate program: earn recurring commissions by referring commerce operators",
    targetKeywords: [
      "UnifyOne affiliate",
      "1Commerce affiliate",
      "commerce platform affiliate program",
      "SaaS affiliate 2026",
    ],
  },
  {
    slug: "gig-economy-earnings-tracker",
    type: "blog_post",
    topic:
      "Best gig economy earnings trackers in 2026 — comparing Gridwise, Hurdlr, and UnifyOne Gig Command",
    targetKeywords: [
      "gig economy earnings tracker",
      "Gridwise alternative",
      "Hurdlr alternative",
      "DoorDash earnings tracker",
      "Gig Command UnifyOne",
    ],
  },
  {
    slug: "shopify-integration-guide",
    type: "blog_post",
    topic:
      "How to integrate Shopify with UnifyOne: a step-by-step guide to syncing products, orders, and inventory across tenants",
    targetKeywords: [
      "Shopify UnifyOne integration",
      "Shopify multi-tenant sync",
      "UnifyOne Shopify guide",
      "1Commerce Shopify",
    ],
  },
  {
    slug: "stripe-subscription-billing",
    type: "seo_landing",
    topic:
      "UnifyOne Stripe subscription billing: how the platform manages recurring revenue, dunning, and plan upgrades",
    targetKeywords: [
      "UnifyOne Stripe billing",
      "Stripe subscription SaaS",
      "UnifyOne subscription",
      "1Commerce billing",
      "recurring revenue SaaS",
    ],
  },
  // ── Use-case / audience ───────────────────────────────────────────────────
  {
    slug: "commerce-platform-for-agencies",
    type: "blog_post",
    topic:
      "Why ecommerce agencies are switching to multi-tenant SaaS platforms like UnifyOne to manage client stores at scale",
    targetKeywords: [
      "ecommerce agency platform",
      "white-label ecommerce",
      "agency SaaS commerce",
      "UnifyOne agency",
      "multi-tenant agency",
    ],
  },
  {
    slug: "pnw-enterprises-1commerce",
    type: "seo_landing",
    topic:
      "PNW Enterprises and 1Commerce LLC: the Pacific Northwest company behind UnifyOne commerce platform",
    targetKeywords: [
      "PNW Enterprises 1Commerce",
      "1Commerce LLC Pacific Northwest",
      "PNW ecommerce company",
      "UnifyOne company",
      "1Commerce founders",
    ],
  },
  {
    slug: "unifyone-gamification-commerce",
    type: "blog_post",
    topic:
      "How UnifyOne gamification turns gig workers into loyal power users: points, achievements, and leaderboards",
    targetKeywords: [
      "commerce gamification",
      "gig worker gamification",
      "UnifyOne achievements",
      "loyalty program commerce",
      "1Commerce gamification",
    ],
  },
  {
    slug: "unifyone-free-plan-starter",
    type: "seo_landing",
    topic:
      "UnifyOne Starter free plan: what you get without a credit card and how to upgrade to Pro or Scale",
    targetKeywords: [
      "UnifyOne free plan",
      "1Commerce free tier",
      "Starter plan UnifyOne",
      "free ecommerce SaaS",
      "no credit card commerce",
    ],
  },
  {
    slug: "social-commerce-automation",
    type: "blog_post",
    topic:
      "Social commerce automation in 2026: how UnifyOne schedules content, tracks Meta CAPI events, and converts followers into buyers",
    targetKeywords: [
      "social commerce automation",
      "Meta CAPI ecommerce",
      "social media ecommerce",
      "UnifyOne social",
      "1Commerce social automation",
    ],
  },
  // ── FAQ depth ─────────────────────────────────────────────────────────────
  {
    slug: "unifyone-faq-pricing",
    type: "faq_expansion",
    topic:
      "Comprehensive FAQ about UnifyOne pricing, plan limits, upgrade paths, and refund policy",
    targetKeywords: [
      "UnifyOne pricing FAQ",
      "1Commerce pricing questions",
      "UnifyOne plan comparison",
      "UnifyOne refund policy",
    ],
  },
  {
    slug: "1commerce-company-overview",
    type: "seo_landing",
    topic:
      "1Commerce LLC company overview: history, mission, products, and the Cathedral Framework that powers UnifyOne",
    targetKeywords: [
      "1Commerce LLC",
      "1Commerce company",
      "1Commerce overview",
      "UnifyOne company history",
      "PNW Enterprises",
    ],
  },
  {
    slug: "unifyone-paypal-integration",
    type: "blog_post",
    topic:
      "Accepting PayPal payments in UnifyOne: setup guide, order capture flow, and webhook verification",
    targetKeywords: [
      "UnifyOne PayPal",
      "PayPal ecommerce integration",
      "accept PayPal SaaS",
      "1Commerce PayPal",
      "UnifyOne payment methods",
    ],
  },
  {
    slug: "gig-worker-route-optimizer",
    type: "blog_post",
    topic:
      "Gig worker route optimization with UnifyOne Gig Command: GPS shift tracking, zone heat maps, and earnings per mile",
    targetKeywords: [
      "gig worker route optimizer",
      "DoorDash route optimization",
      "Uber Eats route planner",
      "UnifyOne Gig Command",
      "GPS gig tracking",
    ],
  },
  {
    slug: "unifyone-security-compliance",
    type: "seo_landing",
    topic:
      "UnifyOne security and compliance: JWT auth, RBAC, governance audit logs, and multi-tenant data isolation",
    targetKeywords: [
      "UnifyOne security",
      "ecommerce platform compliance",
      "multi-tenant data security",
      "1Commerce RBAC",
      "UnifyOne governance",
    ],
  },
];

// ─── Content Generation ──────────────────────────────────────────────────────

export interface GeneratedSeoContent {
  title: string;
  h1: string;
  tagline: string;
  description: string;
  keywords: string[];
  sections: Array<{
    heading: string;
    paragraphs: string[];
    bullets?: string[];
  }>;
  faq: Array<{ q: string; a: string }>;
  related: string[];
}

const CONTENT_SCHEMA = {
  name: "seo_content",
  strict: false,
  schema: {
    type: "object",
    required: [
      "title",
      "h1",
      "tagline",
      "description",
      "keywords",
      "sections",
      "faq",
      "related",
    ],
    properties: {
      title: {
        type: "string",
        description: "Full <title> tag text, 50-65 chars, keyword-rich",
      },
      h1: {
        type: "string",
        description: "Primary heading for the page, 40-80 chars",
      },
      tagline: {
        type: "string",
        description:
          "One descriptive sentence (120-160 chars) that summarises the page topic",
      },
      description: {
        type: "string",
        description:
          "Meta description, 140-160 chars, unique, includes primary keyword",
      },
      keywords: {
        type: "array",
        items: { type: "string" },
        description:
          "8-12 target keywords including the provided ones plus semantic variations",
      },
      sections: {
        type: "array",
        description:
          "3-5 content sections. Each has a heading, 2-3 paragraphs, and optional bullets.",
        items: {
          type: "object",
          required: ["heading", "paragraphs"],
          properties: {
            heading: { type: "string" },
            paragraphs: { type: "array", items: { type: "string" } },
            bullets: { type: "array", items: { type: "string" } },
          },
        },
      },
      faq: {
        type: "array",
        description: "4-6 FAQ items targeting long-tail search queries",
        items: {
          type: "object",
          required: ["q", "a"],
          properties: {
            q: { type: "string" },
            a: { type: "string" },
          },
        },
      },
      related: {
        type: "array",
        description:
          "2-4 related blog post slug strings (URL-safe, hyphenated) from within the UnifyOne / 1Commerce content library for internal linking",
        items: { type: "string" },
      },
    },
  },
};

/**
 * Generate structured SEO content for a given topic using the LLM.
 *
 * Returns parsed `GeneratedSeoContent` or throws on error.
 */
export async function generateSeoContent(
  topic: string,
  targetKeywords: string[],
  type: "blog_post" | "seo_landing" | "faq_expansion"
): Promise<GeneratedSeoContent> {
  const typeInstructions: Record<string, string> = {
    blog_post:
      "Write as an informative, in-depth blog article (800-1200 words total). Use a conversational but authoritative tone. Include data-driven insights and actionable takeaways.",
    seo_landing:
      "Write as a focused SEO landing page (600-900 words total). Emphasise product benefits and differentiators. Include a clear value proposition in the first section.",
    faq_expansion:
      "Write as a comprehensive FAQ page (400-600 words total). Focus on answering common buyer questions. Every section heading should be a question.",
  };

  const systemPrompt = `You are an expert SEO content writer for UnifyOne, the AI-powered multi-tenant commerce platform by 1Commerce LLC (also known as 1-commerce, PNW Enterprises). 

Your content must:
- Be factually accurate about UnifyOne's product capabilities
- Include the target keywords naturally throughout the text
- Follow E-E-A-T principles (expertise, authoritativeness, trustworthiness)
- Avoid keyword stuffing — density should feel natural
- Reference UnifyOne's real features: multi-tenant dashboard, Kai AI assistant, Gig Command, Money Manager, Stripe/PayPal/Square/Shopify integrations, gamification, governance, subscription billing
- Mention brand variations naturally where appropriate: UnifOne, OneCommerc, 1-commerce, 1commerce, PNW Enterprises
- ALWAYS return valid JSON conforming to the provided schema. Do not include any text outside the JSON.

${typeInstructions[type] ?? typeInstructions.blog_post}`;

  const userPrompt = `Generate SEO content for the following topic:

Topic: ${topic}
Target Keywords: ${targetKeywords.join(", ")}
Content Type: ${type}

Return structured JSON content following the schema exactly.`;

  const result = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    outputSchema: CONTENT_SCHEMA,
    maxTokens: 4096,
  });

  const rawContent = result.choices[0]?.message?.content;
  if (typeof rawContent !== "string" || !rawContent.trim()) {
    throw new Error("LLM returned empty content");
  }

  // Extract JSON — the model should return clean JSON but strip markdown fences if present
  const jsonStr = rawContent
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  const parsed = JSON.parse(jsonStr) as GeneratedSeoContent;

  // Basic validation
  if (!parsed.title || !parsed.h1 || !Array.isArray(parsed.sections)) {
    throw new Error("LLM response missing required fields");
  }

  return parsed;
}

// ─── Run Generation ──────────────────────────────────────────────────────────

export interface GenerationRunResult {
  runId: string;
  attempted: number;
  generated: number;
  failed: number;
  skipped: number;
  errors: string[];
}

/**
 * Run a generation batch: pick `count` topics from the pool that don't yet
 * have a non-failed job in the DB, generate content for each, and persist results.
 *
 * @param count   How many new content pieces to generate (default 3)
 * @param runId   Identifier for this run (ISO timestamp or UUID)
 */
export async function runSeoGenerationBatch(
  count = 3,
  runId?: string
): Promise<GenerationRunResult> {
  const batchRunId = runId ?? new Date().toISOString();
  const result: GenerationRunResult = {
    runId: batchRunId,
    attempted: 0,
    generated: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  const db = await getDb();
  if (!db) {
    result.errors.push("Database unavailable");
    return result;
  }

  // Fetch all existing slugs to avoid duplicating already-attempted content
  const existing = await db
    .select({ slug: seoContentJobs.slug, status: seoContentJobs.status })
    .from(seoContentJobs);

  const existingNonFailed = new Set(
    existing
      .filter(r => r.status !== "failed" && r.status !== "rejected")
      .map(r => r.slug)
  );

  // Filter topics not yet in DB (or only previously failed) and pick `count` of them
  const candidates = SEO_TOPIC_POOL.filter(t => !existingNonFailed.has(t.slug));

  if (candidates.length === 0) {
    console.log(
      "[seo-generator] All topics already have content jobs — nothing to do."
    );
    return result;
  }

  const batch = candidates.slice(0, count);

  for (const topic of batch) {
    result.attempted++;

    // Insert a "generating" placeholder so concurrent runs don't duplicate work
    let jobId: number;
    try {
      const [inserted] = await db
        .insert(seoContentJobs)
        .values({
          slug: topic.slug,
          type: topic.type,
          status: "generating",
          topic: topic.topic,
          targetKeywords: topic.targetKeywords,
          runId: batchRunId,
        })
        .onConflictDoNothing()
        .returning({ id: seoContentJobs.id });

      if (!inserted) {
        // Another run already claimed this slug
        result.skipped++;
        continue;
      }
      jobId = inserted.id;
    } catch (err) {
      result.failed++;
      result.errors.push(
        `[${topic.slug}] insert failed: ${(err as Error).message}`
      );
      continue;
    }

    // Generate content via LLM
    try {
      const content = await generateSeoContent(
        topic.topic,
        topic.targetKeywords,
        topic.type
      );

      await db
        .update(seoContentJobs)
        .set({
          status: "generated",
          title: content.title,
          h1: content.h1,
          tagline: content.tagline,
          description: content.description,
          keywords: content.keywords,
          sections: content.sections,
          faq: content.faq,
          related: content.related,
          generatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(seoContentJobs.id, jobId));

      result.generated++;
      console.log(`[seo-generator] Generated: ${topic.slug}`);
    } catch (err) {
      const msg = (err as Error).message;
      result.failed++;
      result.errors.push(`[${topic.slug}] generation failed: ${msg}`);

      // Mark the placeholder as failed
      await db
        .update(seoContentJobs)
        .set({
          status: "failed",
          errorMessage: msg.slice(0, 1000),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(seoContentJobs.id, jobId),
            eq(seoContentJobs.status, "generating")
          )
        );
    }
  }

  return result;
}
