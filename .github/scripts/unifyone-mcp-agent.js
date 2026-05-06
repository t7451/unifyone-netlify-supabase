import {
  callGroq,
  loadMission,
  parseJsonLoose,
  readText,
  runCommand,
  trackedFiles,
  writeAgentReport,
} from "./agent-utils.js";

const SYSTEM = `You are the UnifyOne MCP Agent. Focus on Model Context Protocol 2025-03-26 compliance: tool discovery, schemas, versioned endpoint paths, stdio/HTTP/SSE transport assumptions, OAuth 2.1 for HTTP, require_approval safety, audit logs, governance kill switches, and MCP tests. Return JSON with analysis_summary and issues_found.`;

async function main() {
  const mission = await loadMission();
  const files = await trackedFiles([
    "src-typescript/",
    "server/routers/mcp",
    "server/lib/mcp",
    "server/__tests__/netlify-mcp",
  ]);
  const sample = await Promise.all(
    files.slice(0, 50).map(async file => ({
      file,
      excerpt: await readText(file, 3000),
    }))
  );
  const commands = [
    runCommand(
      "pnpm exec vitest run server/routers/__tests__/mcp.test.ts server/lib/__tests__/mcpClient.test.ts server/__tests__/netlify-mcp-dispatcher.test.ts",
      { timeoutMs: 120_000 }
    ),
  ];
  const failed = commands.filter(command => !command.ok);
  const groq = await callGroq({
    system: SYSTEM,
    user: JSON.stringify({
      mission: mission.agents?.mcp || mission,
      files: sample,
      command_output: commands,
    }),
    json: true,
  });
  const parsed = parseJsonLoose(groq.text);

  await writeAgentReport("mcp", {
    analysis_summary:
      parsed?.analysis_summary ||
      (failed.length ? "MCP validation failed." : "MCP validation passed."),
    issues_found:
      parsed?.issues_found ||
      failed.map(command => ({
        file: "server/routers/mcp.ts",
        issue: `${command.command} failed`,
        priority: "high",
      })),
    commands,
    groq_usage: groq.usage,
    groq_error: groq.error || groq.skipped,
    files_sampled: sample.map(item => item.file),
  });

  if (failed.length > 0) process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
