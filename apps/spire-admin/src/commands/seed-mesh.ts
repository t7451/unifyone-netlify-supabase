import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  connectNeon,
  loadEnv,
  logger,
  meshCoverageReport,
  MeshSeedSchema,
  seedMesh,
} from "@1commerce/spire";

const here = dirname(fileURLToPath(import.meta.url));
const configPath = join(
  here,
  "..",
  "..",
  "config",
  "mesh",
  "topic-clusters.json"
);

export async function seedMeshCommand(): Promise<void> {
  const raw = readFileSync(configPath, "utf8");
  const parsed = MeshSeedSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new Error(
      `Invalid config/mesh/topic-clusters.json: ${parsed.error.issues
        .map(
          (i: { path: (string | number)[]; message: string }) =>
            `${i.path.join(".")}: ${i.message}`
        )
        .join("; ")}`
    );
  }

  const env = loadEnv(["NEON_DATABASE_URL"] as const);
  const { sql: rawSql, db } = connectNeon(env.NEON_DATABASE_URL);
  try {
    const result = await seedMesh({ db, seed: parsed.data });
    logger.info(result, "Mesh seeded");
    if (result.skippedMissingSites.length > 0) {
      logger.warn(
        { missing: result.skippedMissingSites },
        "Coverage references sites that are not registered. Register them (`spire register <slug>`), then re-run `spire mesh seed`."
      );
    }
  } finally {
    await rawSql.end({ timeout: 5 });
  }
}

export async function meshReportCommand(): Promise<void> {
  const env = loadEnv(["NEON_DATABASE_URL"] as const);
  const { sql: rawSql, db } = connectNeon(env.NEON_DATABASE_URL);
  try {
    const report = await meshCoverageReport(db);
    logger.info({ clusters: report.clusters }, "Mesh coverage");
    if (report.orphans.length > 0) {
      logger.warn(
        { orphans: report.orphans },
        "Clusters with zero site coverage — mesh linking disabled for these"
      );
    }
  } finally {
    await rawSql.end({ timeout: 5 });
  }
}
