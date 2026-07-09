import { TRPCError } from "@trpc/server";
import { invokeLLM } from "../../_core/llm";
import { publishStoredPost } from "../../lib/socialScheduler";
import * as repo from "./social.repo";

type Platform = "twitter" | "instagram" | "linkedin" | "facebook" | "tiktok";
type Tone =
  | "professional"
  | "casual"
  | "excited"
  | "informative"
  | "promotional";
type ListStatus =
  | "draft"
  | "scheduled"
  | "published"
  | "failed"
  | "cancelled"
  | "all";

export interface AiComposeInput {
  topic: string;
  platforms: Platform[];
  tone: Tone;
  includeHashtags: boolean;
  includeEmoji: boolean;
  productName?: string;
  storeUrl?: string;
}

export async function aiCompose(input: AiComposeInput) {
  const platformInstructions = input.platforms
    .map(p => {
      if (p === "twitter") return "Twitter/X: max 280 chars, punchy and direct";
      if (p === "linkedin")
        return "LinkedIn: professional tone, 1-3 paragraphs, thought leadership";
      if (p === "instagram")
        return "Instagram: visual-first, engaging caption, strong CTA";
      if (p === "facebook")
        return "Facebook: conversational, community-focused, 1-2 paragraphs";
      if (p === "tiktok")
        return "TikTok: trendy, hook in first line, Gen Z friendly";
      return p;
    })
    .join("\n");

  const systemPrompt = `You are a social media expert for UnifyOne, the earnings and tax app for gig and 1099 workers — earnings clarity, IRS mileage tracking, and quarterly tax estimates, with optional storefront tools for operators who also sell.
Generate platform-specific social media posts. Each post must be optimized for its platform.
${input.includeHashtags ? "Include relevant hashtags." : "Do not include hashtags."}
${input.includeEmoji ? "Use emojis tastefully." : "Do not use emojis."}
Tone: ${input.tone}.
IMPORTANT: All posts must include FTC-compliant disclosure if promoting a product or earning referral credits.
Return a JSON object with keys matching each platform name, each containing the post text.`;

  const userPrompt = `Create social media posts about: "${input.topic}"
${input.productName ? `Product: ${input.productName}` : ""}
${input.storeUrl ? `Link URL: ${input.storeUrl}` : ""}

Platform requirements:
${platformInstructions}

Return JSON with keys: ${input.platforms.join(", ")}`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "social_posts",
        strict: true,
        schema: {
          type: "object",
          properties: Object.fromEntries(
            input.platforms.map(p => [
              p,
              { type: "string", description: `Post content for ${p}` },
            ])
          ),
          required: input.platforms,
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  const posts = JSON.parse(typeof content === "string" ? content : "{}");
  return { posts, aiGenerated: true };
}

export interface CreatePostInput {
  content: string;
  platforms: Platform[];
  scheduledAt?: string;
  campaignTag?: string;
  utmCampaign?: string;
  aiGenerated: boolean;
}

export async function createPost(
  user: { id: number; tenantId?: number | null },
  input: CreatePostInput
) {
  const db = await repo.requireDb();
  const tenantId = user.tenantId;
  if (!tenantId)
    throw new TRPCError({ code: "FORBIDDEN", message: "No active tenant" });

  const status = input.scheduledAt ? "scheduled" : "draft";
  const result = await repo.insertPost(db, {
    tenantId,
    userId: user.id,
    content: input.content,
    platforms: input.platforms,
    status,
    scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
    campaignTag: input.campaignTag,
    utmSource: "unifyone",
    utmMedium: "social",
    utmCampaign: input.utmCampaign,
    aiGenerated: input.aiGenerated,
  });
  return { id: result.id, status };
}

export async function listPosts(
  tenantId: number | null | undefined,
  status: ListStatus,
  limit: number
) {
  const db = await repo.requireDb();
  if (!tenantId)
    throw new TRPCError({ code: "FORBIDDEN", message: "No active tenant" });

  return repo.listPosts(db, tenantId, status, limit);
}

export async function publishPost(
  user: { id: number; tenantId?: number | null },
  postId: number
) {
  await repo.requireDb();
  const tenantId = user.tenantId;
  if (!tenantId)
    throw new TRPCError({ code: "FORBIDDEN", message: "No active tenant" });

  // Shared core: marks published, native-dispatches to connected accounts,
  // and fires the social.post.published automation event. The scheduler
  // uses the same path so manual and scheduled publishing match.
  return publishStoredPost(tenantId, postId, { userId: user.id });
}

export async function deletePost(
  tenantId: number | null | undefined,
  postId: number
) {
  const db = await repo.requireDb();
  if (!tenantId)
    throw new TRPCError({ code: "FORBIDDEN", message: "No active tenant" });

  await repo.deletePost(db, postId, tenantId);
  return { success: true };
}

export async function getAnalytics(tenantId: number | null | undefined) {
  const db = await repo.requireDb();
  if (!tenantId)
    return {
      totalPosts: 0,
      published: 0,
      scheduled: 0,
      drafts: 0,
      platforms: {},
    };

  const posts = await repo.listPostsForTenant(db, tenantId);

  const published = posts.filter(p => p.status === "published").length;
  const scheduled = posts.filter(p => p.status === "scheduled").length;
  const drafts = posts.filter(p => p.status === "draft").length;

  const platformCounts: Record<string, number> = {};
  for (const post of posts) {
    const platforms = (post.platforms as string[]) || [];
    for (const p of platforms) {
      platformCounts[p] = (platformCounts[p] || 0) + 1;
    }
  }

  return {
    totalPosts: posts.length,
    published,
    scheduled,
    drafts,
    platforms: platformCounts,
  };
}
