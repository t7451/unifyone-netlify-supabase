import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }

const sql = neon(url);
try {
  const rows = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'gig_shifts' AND column_name = 'routeWaypoints'
  `;
  if (rows.length > 0) {
    console.log("Column routeWaypoints already exists — skipping.");
  } else {
    await sql`ALTER TABLE gig_shifts ADD COLUMN "routeWaypoints" jsonb`;
    console.log("✓ Added routeWaypoints column to gig_shifts");
  }
} catch (error) {
  console.error("❌ Error:", error.message);
  process.exit(1);
}
