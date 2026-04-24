import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    author: z.string().default("UnifyOne"),
    tags: z.array(z.string()).default([]),
    coverImage: z.string().optional(),
    draft: z.boolean().default(false),
    // Spire-generated metadata (optional — hand-authored posts omit these).
    spireGenerated: z.boolean().optional(),
    spirePlanId: z.string().optional(),
    qualityScore: z.number().int().min(0).max(100).optional(),
  }),
});

export const collections = { blog };
