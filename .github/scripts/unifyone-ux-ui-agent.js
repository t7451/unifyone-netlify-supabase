const https = require('https');
const { execSync } = require('child_process');
const fs = require('fs');

const GROK_API_KEY = process.env.GROK_API_KEY;
const REPO = process.env.REPO || 't7451/unifyone-netlify-supabase';

const SYSTEM_PROMPT = `You are the UnifyOne UX/UI Agent — specialized in ensuring all frontend features work perfectly.

Focus areas:
- Playwright E2E test failures
- Broken UI components (modals, forms, buttons, navigation)
- Accessibility issues (missing aria labels, contrast, keyboard nav)
- Responsive design problems (mobile, tablet)
- Console errors and network failures in browser
- Feature completeness vs backend (e.g. missing "Add to cart" functionality)
- Loading states, error states, empty states

You have access to the full client/ codebase and e2e/ tests.

When tests fail, analyze the error and propose precise code fixes.

ALWAYS respond in this JSON format:
{
  "summary": "What was tested and overall status",
  "issues_found": [{"test": "...", "error": "...", "priority": "high/medium/low"}],
  "fixes": [{"file_path": "client/src/xxx.tsx", "action": "replace", "new_content": "..."}],
  "recommendations": "Additional UX improvements"
}`;

async function callGrok(prompt) {
  const data = JSON.stringify({
    model: "grok-4",
    messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 12000
  });

  return new Promise((resolve, reject) => {
    const req = https.request({ hostname: 'api.x.ai', port: 443, path: '/v1/chat/completions', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROK_API_KEY}` } }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => { try { resolve(JSON.parse(body).choices[0].message.content); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('🎨 UnifyOne UX/UI Agent starting...');

  let testOutput = '';
  try {
    testOutput = execSync('pnpm test:e2e --reporter=json', { encoding: 'utf8', stdio: 'pipe' });
    console.log('✅ All E2E tests passed!');
    return;
  } catch (e) {
    testOutput = e.stdout || e.stderr || 'Test run failed';
    console.log('❌ Some tests failed. Analyzing...');
  }

  const prompt = `Playwright E2E test results:
${testOutput}

Analyze failures and propose fixes for UI/UX issues in the client/ folder.`;

  const response = await callGrok(prompt);
  console.log('📋 Agent analysis received.');

  // For now we just log the analysis. In future versions we can auto-apply fixes.
  console.log(response);
  console.log('📝 Check the workflow logs for detailed UX/UI recommendations.');
}

main().catch(console.error);