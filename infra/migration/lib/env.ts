import { z } from "zod";

// Each script calls loadEnv(keys) with only the vars it needs.
// This means `pnpm 01:export` doesn't require a Clerk key, etc.

const schema = {
  SUPABASE_DB_URL: z
    .string()
    .url()
    .refine(v => v.startsWith("postgres://") || v.startsWith("postgresql://"), {
      message: "SUPABASE_DB_URL must be a postgres:// connection string",
    }),
  SUPABASE_PROJECT_REF: z.string().optional(),
  NEON_DATABASE_URL: z
    .string()
    .url()
    .refine(v => v.startsWith("postgres://") || v.startsWith("postgresql://"), {
      message: "NEON_DATABASE_URL must be a postgres:// connection string",
    }),
  CLERK_SECRET_KEY: z.string().regex(/^sk_(test|live)_/, {
    message: "CLERK_SECRET_KEY must start with sk_test_ or sk_live_",
  }),
  DRY_RUN: z
    .enum(["true", "false"])
    .default("true")
    .transform(v => v === "true"),
  CLERK_RPS: z
    .string()
    .default("15")
    .transform(v => {
      const n = Number(v);
      if (!Number.isFinite(n) || n <= 0 || n > 50) {
        throw new Error(`CLERK_RPS must be a positive number ≤ 50 (got ${v})`);
      }
      return n;
    }),
  SUPABASE_EXPORT_TABLES: z.string().optional(),
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
    // Safe: parse output of schema[key] is z.infer<(typeof schema)[key]>.
    (out as Record<string, unknown>)[key] = parsed.data;
  }
  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed for ${errors.length} variable(s):\n${errors.join("\n")}\n\nCopy infra/migration/.env.example to .env and fill in the missing values.`
    );
  }
  return out;
}
