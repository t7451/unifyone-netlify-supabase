import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

// infra/migration/lib → infra/migration
const root = join(here, "..");
const exportsDir = join(root, "exports");

export const paths = {
  root,
  exports: exportsDir,
  authUsersCsv: join(exportsDir, "auth_users.csv"),
  appDataSql: join(exportsDir, "app_data.sql"),
  manifest: join(exportsDir, "manifest.json"),
  userMappingJsonl: join(exportsDir, "user_mapping.jsonl"),
  orphanedCredits: join(exportsDir, "orphaned_credits.jsonl"),
  auditReport: join(exportsDir, "audit_report.json"),
};
