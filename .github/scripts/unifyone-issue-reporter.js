import fs from "node:fs/promises";
import path from "node:path";
import { REPORT_DIR, runCommand } from "./agent-utils.js";

async function readReports() {
  try {
    const entries = await fs.readdir(REPORT_DIR);
    const reports = [];
    for (const entry of entries.filter(name => name.endsWith("-report.json"))) {
      reports.push(
        JSON.parse(await fs.readFile(path.join(REPORT_DIR, entry), "utf8"))
      );
    }
    return reports;
  } catch {
    return [];
  }
}

function issueTitle(report, issue) {
  const subject = issue.file || "repository";
  const summary = String(issue.issue || issue.title || "agent finding").slice(
    0,
    80
  );
  return `[${report.agent}] ${subject}: ${summary}`;
}

async function main() {
  if (process.env.CREATE_GITHUB_ISSUES !== "true") {
    console.log(
      "Issue creation disabled. Set CREATE_GITHUB_ISSUES=true to enable."
    );
    return;
  }

  const reports = await readReports();
  let created = 0;
  for (const report of reports) {
    for (const issue of report.issues_found || []) {
      if (issue.priority !== "high") continue;
      const title = issueTitle(report, issue);
      const existing = runCommand(
        `gh issue list --state open --search ${JSON.stringify(`${title} in:title`)} --json title --jq '.[].title'`
      );
      if (existing.stdout.split("\n").some(line => line.trim() === title)) {
        console.log(`Existing issue found: ${title}`);
        continue;
      }
      const body = [
        `Agent: ${report.agent}`,
        `Priority: ${issue.priority}`,
        `File: ${issue.file || "repo"}`,
        "",
        issue.issue || issue.title || "No detail provided.",
        "",
        `Workflow run: ${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`,
      ].join("\n");
      const createdIssue = runCommand(
        `gh issue create --title ${JSON.stringify(title)} --body ${JSON.stringify(body)}`
      );
      if (createdIssue.ok) created += 1;
      else console.error(createdIssue.stderr || createdIssue.stdout);
    }
  }
  console.log(`Created ${created} high-priority issue(s).`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
