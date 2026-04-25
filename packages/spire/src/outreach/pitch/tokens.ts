import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const promptsDir = join(here, "prompts");

// Pitch prompts live alongside the drafter rather than the global prompts/
// dir. They aren't reused by other modules, and keeping them next to the code
// that fills them in makes drift less likely.

export function renderPitchPrompt(
  name: "broken-link" | "resource-page" | "guest-post" | "breakup",
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
      `Pitch prompt ${name}.md has unfilled variables: ${Array.from(new Set(missing)).join(", ")}`
    );
  }
  return rendered;
}
