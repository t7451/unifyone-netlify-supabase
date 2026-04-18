import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const connectionString = import.meta.env.NEON_DATABASE_URL;
if (!connectionString) throw new Error("NEON_DATABASE_URL not set");

const sql = neon(connectionString);
export const db = drizzle(sql, { schema });
export { schema };
