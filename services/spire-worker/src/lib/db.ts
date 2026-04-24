import { connectNeon } from "@1commerce/spire";

export function connect() {
  const url = process.env.NEON_DATABASE_URL;
  if (!url) throw new Error("NEON_DATABASE_URL is required");
  return connectNeon(url);
}

export { schema } from "@1commerce/spire";
