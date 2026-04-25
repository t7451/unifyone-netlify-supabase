import { z } from "zod";

// Per-call env loading so `spire status` doesn't require an ANTHROPIC_API_KEY
// and `spire write` doesn't require a GITHUB_TOKEN.

const schema = {
  NEON_DATABASE_URL: z
    .string()
    .url()
    .refine(v => v.startsWith("postgres://") || v.startsWith("postgresql://"), {
      message: "NEON_DATABASE_URL must be a postgres:// connection string",
    }),
  ANTHROPIC_API_KEY: z.string().regex(/^sk-ant-/, {
    message: "ANTHROPIC_API_KEY must start with sk-ant-",
  }),
  GITHUB_TOKEN: z.string().min(20),
  GITHUB_OWNER: z.string().min(1),
  GITHUB_REPO: z.string().min(1),
  GITHUB_BRANCH: z.string().min(1).default("main"),
  MAILERLITE_API_KEY: z.string().optional(),
  DIGEST_TO_EMAIL: z.string().email().optional(),
  DIGEST_TO_NAME: z.string().optional(),
  SPIRE_MODEL: z.string().default("claude-opus-4-7"),
  SPIRE_TICK_BRIEFS_PER_RUN: z
    .string()
    .default("5")
    .transform(v => {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > 50) {
        throw new Error(`SPIRE_TICK_BRIEFS_PER_RUN must be 0–50 (got ${v})`);
      }
      return n;
    }),
  SPIRE_TICK_ARTICLES_PER_RUN: z
    .string()
    .default("2")
    .transform(v => {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > 10) {
        throw new Error(`SPIRE_TICK_ARTICLES_PER_RUN must be 0–10 (got ${v})`);
      }
      return n;
    }),
  HUNTER_API_KEY: z.string().min(10).optional(),
  RESEND_OUTREACH_API_KEY: z.string().min(10).optional(),
  OUTREACH_SUPPRESSION_HMAC_SECRET: z.string().min(16).optional(),
  RESEND_INBOUND_REPLIES_SECRET: z.string().min(8).optional(),
  RESEND_EVENTS_SECRET: z.string().min(8).optional(),
} as const;

type Key = keyof typeof schema;
type Env<K extends Key> = { [P in K]: z.infer<(typeof schema)[P]> };

export function loadEnv<K extends Key>(keys: readonly K[]): Env<K> {
  const out = {} as Env<K>;
  const errors: string[] = [];
  for (const key of keys) {
    const raw = process.env[key];
    const parsed = schema[key].safeParse(raw);
    if (!parsed.success) {
      errors.push(
        `  ${key}: ${parsed.error.issues.map(i => i.message).join(", ")}`
      );
      continue;
    }
    (out as Record<string, unknown>)[key] = parsed.data;
  }
  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed for ${errors.length} variable(s):\n${errors.join("\n")}`
    );
  }
  return out;
}
