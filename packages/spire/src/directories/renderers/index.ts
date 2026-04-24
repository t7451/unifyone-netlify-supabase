import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { schema } from "../../lib/db.js";
import type { SubmissionPayload } from "../types.js";
import { unifyoneRenderer } from "./unifyone.js";
import { theSignalRenderer } from "./the-signal.js";

// Map of site.slug → renderer. Adding a site means dropping a new file in
// this folder and wiring it here. Each renderer returns a fully-populated
// SubmissionPayload ready to be handed to any submitter.

export type SiteRenderer = (input: {
  site: typeof schema.sites.$inferSelect;
}) => SubmissionPayload;

const renderers: Record<string, SiteRenderer> = {
  unifyone: unifyoneRenderer,
  "the-signal": theSignalRenderer,
};

export async function renderSubmissionPayload(input: {
  db: PostgresJsDatabase<typeof schema>;
  siteId: string;
}): Promise<SubmissionPayload> {
  const [site] = await input.db
    .select()
    .from(schema.sites)
    .where(eq(schema.sites.id, input.siteId))
    .limit(1);
  if (!site) throw new Error(`Site not found: ${input.siteId}`);

  const renderer = renderers[site.slug];
  if (!renderer) {
    throw new Error(
      `No submission renderer registered for site "${site.slug}". Add one at packages/spire/src/directories/renderers/${site.slug}.ts and wire it in index.ts.`
    );
  }
  return renderer({ site });
}

export { unifyoneRenderer, theSignalRenderer };
