import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

export const REPO =
  process.env.REPO ||
  process.env.GITHUB_REPOSITORY ||
  "t7451/unifyone-netlify-supabase";
export const REPORT_DIR = ".agent-output";
export const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

export async function ensureReportDir() {
  await fs.mkdir(REPORT_DIR, { recursive: true });
}

export async function readText(filePath, maxChars = 12000) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return content.length > maxChars
      ? `${content.slice(0, maxChars)}\n[truncated]`
      : content;
  } catch {
    return "";
  }
}

export function runCommand(command, options = {}) {
  const result = spawnSync(command, {
    shell: true,
    encoding: "utf8",
    maxBuffer: options.maxBuffer || 20 * 1024 * 1024,
    timeout: options.timeoutMs,
    env: { ...process.env, ...(options.env || {}) },
  });

  return {
    command,
    code: result.status ?? 1,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    ok: (result.status ?? 1) === 0,
  };
}

export async function changedFiles() {
  const base = process.env.GITHUB_BASE_REF
    ? `origin/${process.env.GITHUB_BASE_REF}`
    : "HEAD~1";
  const result = runCommand(
    `git diff --name-only ${base}...HEAD || git diff --name-only HEAD~1..HEAD`
  );
  return result.stdout
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);
}

export async function trackedFiles(prefixes = []) {
  const result = runCommand("git ls-files");
  const files = result.stdout
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  return prefixes.length === 0
    ? files
    : files.filter(file => prefixes.some(prefix => file.startsWith(prefix)));
}

export async function loadMission() {
  try {
    return JSON.parse(
      await fs.readFile(path.join(REPORT_DIR, "mission.json"), "utf8")
    );
  } catch {
    return { summary: "No mission briefing was generated.", changed_files: [] };
  }
}

export async function callGroq({ system, user, json = false }) {
  const apiKey = process.env.GROQ_API_KEY || process.env.GROK_API_KEY;
  if (!apiKey) {
    return { text: "", usage: null, skipped: "GROQ_API_KEY is not set" };
  }

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.2,
        max_tokens: 4000,
        ...(json ? { response_format: { type: "json_object" } } : {}),
      }),
    }
  );

  const body = await response.text();
  if (!response.ok) {
    return {
      text: "",
      usage: null,
      error: `Groq ${response.status}: ${body.slice(0, 500)}`,
    };
  }

  const parsed = JSON.parse(body);
  return {
    text: parsed.choices?.[0]?.message?.content || "",
    usage: parsed.usage || null,
    model: parsed.model,
  };
}

export function parseJsonLoose(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

export async function writeAgentReport(agent, report) {
  await ensureReportDir();
  const normalized = {
    agent,
    generated_at: new Date().toISOString(),
    ...report,
  };
  const jsonPath = path.join(REPORT_DIR, `${agent}-report.json`);
  const mdPath = path.join(REPORT_DIR, `${agent}-report.md`);

  await fs.writeFile(jsonPath, `${JSON.stringify(normalized, null, 2)}\n`);
  await fs.writeFile(mdPath, renderMarkdown(normalized));
  console.log(`Report written: ${jsonPath}`);
  return normalized;
}

function renderMarkdown(report) {
  const issues = Array.isArray(report.issues_found) ? report.issues_found : [];
  const commands = Array.isArray(report.commands) ? report.commands : [];
  return [
    `# ${report.agent} report`,
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Summary",
    "",
    report.analysis_summary || "No summary provided.",
    "",
    "## Issues",
    "",
    issues.length
      ? issues
          .map(
            issue =>
              `- **${issue.priority || "low"}** ${issue.file || "repo"}: ${
                issue.issue || issue.title || "unspecified"
              }`
          )
          .join("\n")
      : "No issues reported.",
    "",
    "## Commands",
    "",
    commands.length
      ? commands
          .map(
            command =>
              `- ${command.ok ? "PASS" : "FAIL"}: \`${command.command}\``
          )
          .join("\n")
      : "No commands recorded.",
    "",
  ].join("\n");
}

export async function startIntegratedServer() {
  const env = {
    ...process.env,
    JWT_SECRET:
      process.env.JWT_SECRET || "local_validation_secret_32_chars_minimum",
    PORT: process.env.PORT || "3000",
  };
  const child = spawn("pnpm", ["dev"], {
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", chunk => process.stdout.write(`[server] ${chunk}`));
  child.stderr.on("data", chunk => process.stderr.write(`[server] ${chunk}`));

  const healthUrl = `http://localhost:${env.PORT}/api/health`;
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(healthUrl);
      if (response.ok)
        return { child, baseUrl: `http://localhost:${env.PORT}` };
    } catch {
      // Server is not ready yet.
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  child.kill("SIGTERM");
  throw new Error(`Integrated server did not become healthy at ${healthUrl}`);
}

export function stopServer(child) {
  if (child && !child.killed) child.kill("SIGTERM");
}
