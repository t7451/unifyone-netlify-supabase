import type { ContentPlan, Site } from "../../schema.js";
import type { Adapter, SyndicationResult } from "../types.js";
import { publishToDevTo } from "./devto.js";
import { publishToHashnode } from "./hashnode.js";
import { publishToMedium } from "./medium.js";
import { publishToLinkedIn } from "./linkedin.js";
import { publishToSubstack } from "./substack.js";

export const adapters: Record<string, Adapter> = {
  devto: publishToDevTo,
  hashnode: publishToHashnode,
  medium: publishToMedium,
  linkedin: publishToLinkedIn,
  substack: publishToSubstack,
};

export async function dispatchAdapter(
  platformSlug: string,
  plan: ContentPlan,
  site: Site
): Promise<SyndicationResult> {
  const adapter = adapters[platformSlug];
  if (!adapter) {
    return {
      ok: false,
      retryable: false,
      error: `No syndication adapter registered for platform "${platformSlug}". Add one at packages/spire/src/syndication/adapters/${platformSlug}.ts and wire it in adapters/index.ts.`,
    };
  }
  return adapter(plan, site);
}

export {
  publishToDevTo,
  publishToHashnode,
  publishToMedium,
  publishToLinkedIn,
  publishToSubstack,
};
