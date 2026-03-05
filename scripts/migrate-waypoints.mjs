import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }

const conn = await mysql.createConnection(url);
try {
  const [rows] = await conn.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'gig_shifts' AND COLUMN_NAME = 'routeWaypoints'"
  );
  if (rows.length > 0) {
    console.log("Column routeWaypoints already exists — skipping.");
  } else {
    await conn.query("ALTER TABLE `gig_shifts` ADD `routeWaypoints` json");
    console.log("✓ Added routeWaypoints column to gig_shifts");
  }
} finally {
  await conn.end();
}
