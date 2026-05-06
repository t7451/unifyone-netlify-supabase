const https = require('https');
const fs = require('fs/promises');
const path = require('path');

const GROK_API_KEY = process.env.GROK_API_KEY;
const REPO = process.env.REPO || 't7451/unifyone-netlify-supabase';

const SYSTEM_PROMPT = `You are the UnifyOne Dev-Agent — fully autonomous, persistent development bot for https://github.com/t7451/unifyone-netlify-supabase.
Operate exactly as the super-agent-mode + unifyone-dev-agent skill.
Proactively scan TODO.md + entire codebase for issues (backlog, security, performance, Drizzle schema, Netlify, tRPC, React 19, best practices, etc.).

CRITICAL ADDITIONAL CONTEXT — Model Context Protocol (MCP) 2025-03-26:
- Your MCP server runs locally at http://localhost:39300/model_context_protocol/2025-03-26/mcp (Stdio + HTTP/SSE transports).
- MCP is the standardized protocol (Anthropic-origin, open spec) for LLM ↔ external tools/resources.
- Must support: tool discovery, OAuth 2.1 auth (client credentials), version negotiation, require_approval flags, SSE streaming.
- Align all governance features (audit_logs, escalation_queue, kill_switches) with MCP safety primitives.
- Watch for: transport mismatches, missing schemas, auth gaps, deprecated patterns from 2025-03-26 spec.

ALWAYS respond with EXACTLY this JSON format and nothing else:
{
  "analysis_summary": "brief overview of scan",
  "issues_found": [{"file": "...", "issue": "...", "priority": "high/medium/low"}],
  "fixes": [
    {
      "file_path": "relative/path/to/file.ts",
      "action": "replace" | "create" | "delete",
      "new_content": "FULL file content here (for replace or create)"
    }
  ],
  "commit_message": "short descriptive commit title"
}

Current date: ${new Date().toISOString()}. This is a pnpm monorepo (client/, server/, netlify/, drizzle/, src-typescript/, etc.). Treat governance, auth, DB schemas, and production files with extreme caution.`;

async function callGrok(prompt) {
  const data = JSON.stringify({
    model: "grok-4",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt }
    ],
    temperature: 0.2,
    max_tokens: 16384
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.x.ai',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve(json.choices[0].message.content);
        } catch (e) {
          reject(new Error('Failed to parse Grok response'));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function applyFix(fix) {
  const fullPath = path.resolve(process.cwd(), fix.file_path);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });

  if (fix.action === 'delete') {
    await fs.rm(fullPath, { force: true });
    console.log(`🗑️ Deleted ${fix.file_path}`);
  } else if (['replace', 'create'].includes(fix.action)) {
    await fs.writeFile(fullPath, fix.new_content, 'utf8');
    console.log(`✅ ${fix.action}d ${fix.file_path}`);
  }
}

async function main() {
  console.log('🚀 UnifyOne Dev-Agent starting autonomous direct-push scan...');

  // Fetch latest TODO.md
  const todoRes = await fetch(`https://raw.githubusercontent.com/${REPO}/main/TODO.md`);
  const todoContent = await todoRes.text();

  const fullPrompt = `Latest TODO.md:
${todoContent}

Perform full autonomous scan and fix cycle NOW.`;

  const responseText = await callGrok(fullPrompt);
  console.log('📥 Raw agent response received. Parsing...');

  let parsed;
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
  } catch (e) {
    console.error('❌ Failed to parse agent JSON. Aborting.');
    console.log(responseText);
    return;
  }

  console.log(`📋 Analysis: ${parsed.analysis_summary}`);
  console.log(`🔍 Issues found: ${parsed.issues_found.length}`);

  if (!parsed.fixes || parsed.fixes.length === 0) {
    console.log('✅ No fixes needed this cycle.');
    return;
  }

  // Apply every fix
  for (const fix of parsed.fixes) {
    await applyFix(fix);
  }

  console.log('✅ All fixes applied. Committing and pushing directly to main...');
}

main().catch(err => {
  console.error('💥 Dev-Agent failed:', err);
  process.exit(1);
});