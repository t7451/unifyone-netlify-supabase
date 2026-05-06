import {
  callGroq,
  loadMission,
  parseJsonLoose,
  readText,
  trackedFiles,
  writeAgentReport,
} from "./agent-utils.js";

const SYSTEM = `You are the UnifyOne Dev-Agent. Focus on backend correctness, tRPC, auth, Drizzle, tenant isolation, Netlify functions, and MCP-aware commerce automation. Return JSON with analysis_summary and issues_found. Do not propose destructive changes or secrets.`;

async function main() {
  const mission = await loadMission();
  const files = await trackedFiles([
    "server/",
    "shared/",
    "drizzle/",
    "netlify/",
    "src-typescript/",
    ".github/",
  ]);
  const sample = await Promise.all(
    files.slice(0, 40).map(async file => ({
      file,
      excerpt: await readText(file, 2500),
    }))
  );
  const groq = await callGroq({
    system: SYSTEM,
    user: JSON.stringify({ mission: mission.agents?.dev || mission, sample }),
    json: true,
  });
  const parsed = parseJsonLoose(groq.text);

  await writeAgentReport("dev", {
    analysis_summary:
      parsed?.analysis_summary ||
      "Dev scan completed with deterministic fallback. Groq reasoning was unavailable or returned non-JSON.",
    issues_found: parsed?.issues_found || [],
    groq_usage: groq.usage,
    groq_error: groq.error || groq.skipped,
    files_sampled: sample.map(item => item.file),
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
