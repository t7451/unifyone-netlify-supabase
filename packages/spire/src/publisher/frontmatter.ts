// Builds Astro content-collection frontmatter. Schema lives in
// apps/unifyone/src/content/config.ts — this module must match it or the
// post fails to render.
//
// Fields used (camelCase, matching Astro's inferred schema):
//   title, description, publishedAt (required)
//   updatedAt, author, tags, coverImage (optional)
//   spireGenerated, spirePlanId, qualityScore (Spire metadata, optional)

export type FrontmatterInput = {
  title: string;
  description: string;
  publishedAt?: Date;
  updatedAt?: Date;
  author?: string;
  tags?: string[];
  spirePlanId: string;
  qualityScore: number;
};

export function buildFrontmatter(input: FrontmatterInput): string {
  const publishedAt = input.publishedAt ?? new Date();
  const fields: Array<[string, string]> = [
    ["title", yamlString(input.title)],
    ["description", yamlString(input.description)],
    ["publishedAt", formatDate(publishedAt)],
  ];
  if (input.updatedAt) fields.push(["updatedAt", formatDate(input.updatedAt)]);
  fields.push(["author", yamlString(input.author ?? "UnifyOne")]);
  if (input.tags && input.tags.length > 0)
    fields.push(["tags", yamlStringArray(input.tags)]);
  fields.push(["spireGenerated", "true"]);
  fields.push(["spirePlanId", yamlString(input.spirePlanId)]);
  fields.push(["qualityScore", String(input.qualityScore)]);

  const body = fields.map(([k, v]) => `${k}: ${v}`).join("\n");
  return `---\n${body}\n---\n`;
}

function formatDate(d: Date): string {
  // YYYY-MM-DD is what Astro's z.coerce.date() handles cleanly without quotes.
  return d.toISOString().slice(0, 10);
}

function yamlString(value: string): string {
  // Always double-quote; escape double quotes and backslashes. Keeps Astro's
  // YAML parser happy even when the value contains colons, brackets, etc.
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
}

function yamlStringArray(values: string[]): string {
  return "[" + values.map(yamlString).join(", ") + "]";
}

// Convenience: glue frontmatter + body.
export function withFrontmatter(frontmatter: string, body: string): string {
  const trimmedBody = body.trim();
  return `${frontmatter}\n${trimmedBody}\n`;
}
