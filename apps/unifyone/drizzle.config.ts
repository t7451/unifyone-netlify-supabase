import type { Config } from "drizzle-kit";

const databaseUrl = process.env.NEON_DATABASE_URL;
if (!databaseUrl) {
  throw new Error("NEON_DATABASE_URL is required for drizzle-kit");
}

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: databaseUrl },
  strict: true,
} satisfies Config;
