import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const promptsDir = join(here, "..", "prompts");

// Simple `{{NAME}}` substitution. Missing keys throw — silent substitution
// gaps are how prompt bugs ship to production.
export function renderPrompt(
  name: string,
  vars: Record<string, string>
): string {
  const raw = readFileSync(join(promptsDir, `${name}.md`), "utf8");
  const missing: string[] = [];
  const rendered = raw.replace(/\{\{([A-Z_]+)\}\}/g, (_, key: string) => {
    if (!(key in vars)) {
      missing.push(key);
      return `{{${key}}}`;
    }
    return vars[key]!;
  });
  if (missing.length > 0) {
    throw new Error(
      `Prompt template ${name}.md has unfilled variables: ${Array.from(new Set(missing)).join(", ")}`
    );
  }
  return rendered;
}

export function loadBrandBrief(): string {
  return readFileSync(join(promptsDir, "brand-brief.md"), "utf8");
}
