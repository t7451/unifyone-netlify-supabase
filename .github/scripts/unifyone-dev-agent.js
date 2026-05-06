const https = require('https');
const fs = require('fs/promises');
const path = require('path');

const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.GROK_API_KEY;
const REPO = process.env.REPO || 't7451/unifyone-netlify-supabase';

const SYSTEM_PROMPT = `You are the UnifyOne Dev-Agent — fully autonomous, persistent development bot.
Use Groq (llama-3.1-70b or qwen-2.5-72b) for fast free reasoning.
... [full MCP + dev knowledge]`;

async function callGroq(prompt) {
  const data = JSON.stringify({
    model: "llama-3.1-70b-versatile",
    messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: prompt }],
    temperature: 0.2,
    max_tokens: 8000
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.groq.com',
      port: 443,
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` }
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve(JSON.parse(body).choices[0].message.content));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('🚀 Dev-Agent (Groq-powered) starting...');
  // ... same logic using callGroq instead of callGrok
}

main().catch(console.error);