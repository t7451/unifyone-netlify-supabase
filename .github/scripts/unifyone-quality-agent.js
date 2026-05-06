import {
  callGroq,
  loadMission,
  parseJsonLoose,
  runCommand,
  writeAgentReport,
} from "./agent-utils.js";

const SYSTEM = `You are the UnifyOne Quality Agent. Analyze validation command output and identify actionable build, lint, test, audit, performance, or release risks. Return JSON with analysis_summary and issues_found.`;

async function main() {
  const mission = await loadMission();
  const commands = [
    runCommand("pnpm check", { timeoutMs: 120_000 }),
    runCommand("pnpm lint", { timeoutMs: 120_000 }),
    runCommand("pnpm test", { timeoutMs: 180_000 }),
    runCommand("pnpm build", { timeoutMs: 180_000 }),
    runCommand("pnpm audit --prod --audit-level moderate", {
      timeoutMs: 120_000,
    }),
  ];
  const failed = commands.filter(command => !command.ok);
  const output = commands
    .map(
      command =>
        `${command.command}\nexit=${command.code}\n${command.stdout}\n${command.stderr}`
    )
    .join("\n\n");
  const groq = await callGroq({
    system: SYSTEM,
    user: JSON.stringify({
      mission: mission.agents?.quality || mission,
      output: output.slice(-16000),
    }),
    json: true,
  });
  const parsed = parseJsonLoose(groq.text);

  await writeAgentReport("quality", {
    analysis_summary:
      parsed?.analysis_summary ||
      (failed.length
        ? "Quality validation failed."
        : "Quality validation passed."),
    issues_found:
      parsed?.issues_found ||
      failed.map(command => ({
        file: "repo",
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
