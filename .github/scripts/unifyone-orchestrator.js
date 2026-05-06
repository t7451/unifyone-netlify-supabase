import fs from "node:fs/promises";
import path from "node:path";
import {
  callGroq,
  changedFiles,
  ensureReportDir,
  parseJsonLoose,
  readText,
  REPORT_DIR,
} from "./agent-utils.js";

const SYSTEM = `You are the UnifyOne agent orchestrator. Produce concise JSON only. Decide the focus for dev, ux-ui, quality, and mcp agents based on changed files, TODO context, and platform risk. Prioritize safe validation over direct code changes.`;

function fallbackMission(files, todo) {
  return {
    summary: "Deterministic mission generated without Groq reasoning.",
    changed_files: files,
    agents: {
      dev: {
        run: true,
        focus:
          "Review backend, tRPC, Drizzle, auth, Netlify, and TODO-sensitive areas.",
      },
      "ux-ui": {
        run:
          files.length === 0 ||
          files.some(
            file => file.startsWith("client/") || file.startsWith("e2e/")
          ),
        focus: "Run browser coverage and report user-facing regressions.",
      },
      quality: {
        run: true,
        focus: "Run lint, tests, build, production audit, and smoke probes.",
      },
      mcp: {
        run:
          files.length === 0 ||
          files.some(
            file => file.startsWith("src-typescript/") || file.includes("mcp")
          ),
        focus:
          "Validate MCP server tests and 2025-03-26 transport/schema assumptions.",
      },
    },
    todo_excerpt: todo.slice(0, 2000),
  };
}

async function main() {
  await ensureReportDir();
  const files = await changedFiles();
  const todo = [
    await readText("TODO.md", 4000),
    await readText("TODO_COMPREHENSIVE.md", 4000),
  ]
    .filter(Boolean)
    .join("\n\n");
  const fallback = fallbackMission(files, todo);

  const groq = await callGroq({
    system: SYSTEM,
    user: JSON.stringify({
      changed_files: files,
      todo_excerpt: todo.slice(0, 6000),
    }),
    json: true,
  });
  const reasoned = parseJsonLoose(groq.text);
  const mission =
    reasoned && reasoned.agents
      ? { ...fallback, ...reasoned, groq_usage: groq.usage }
      : { ...fallback, groq_error: groq.error || groq.skipped };

  await fs.writeFile(
    path.join(REPORT_DIR, "mission.json"),
    `${JSON.stringify(mission, null, 2)}\n`
  );
  await fs.writeFile(
    path.join(REPORT_DIR, "mission.md"),
    [
      "# UnifyOne Agent Mission",
      "",
      mission.summary,
      "",
      `Changed files: ${files.length}`,
      "",
    ].join("\n")
  );
  console.log(JSON.stringify(mission, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
