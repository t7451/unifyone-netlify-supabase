import {
  callGroq,
  loadMission,
  parseJsonLoose,
  runCommand,
  startIntegratedServer,
  stopServer,
  writeAgentReport,
} from "./agent-utils.js";

const SYSTEM = `You are the UnifyOne UX/UI Agent. Focus on user-facing regressions, accessibility, route protection, responsive behavior, Playwright failures, and frontend completeness. Return JSON with analysis_summary and issues_found.`;

async function main() {
  const mission = await loadMission();
  let server;
  const commands = [];

  try {
    server = await startIntegratedServer();
    commands.push(
      runCommand("pnpm test:e2e", {
        timeoutMs: 180_000,
        env: { PLAYWRIGHT_BASE_URL: server.baseUrl },
      })
    );
  } finally {
    stopServer(server?.child);
  }

  const testOutput = commands
    .map(command => `${command.command}\n${command.stdout}\n${command.stderr}`)
    .join("\n\n");
  const groq = await callGroq({
    system: SYSTEM,
    user: JSON.stringify({
      mission: mission.agents?.["ux-ui"] || mission,
      test_output: testOutput.slice(-12000),
    }),
    json: true,
  });
  const parsed = parseJsonLoose(groq.text);
  const failed = commands.filter(command => !command.ok);

  await writeAgentReport("ux-ui", {
    analysis_summary:
      parsed?.analysis_summary ||
      (failed.length
        ? "UX/UI E2E validation failed."
        : "UX/UI E2E validation passed."),
    issues_found:
      parsed?.issues_found ||
      failed.map(command => ({
        file: "e2e",
        issue: `${command.command} failed`,
        priority: "high",
      })),
    commands,
    groq_usage: groq.usage,
    groq_error: groq.error || groq.skipped,
  });

  if (failed.length > 0) process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
