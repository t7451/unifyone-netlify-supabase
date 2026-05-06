/**
 * 1commerce-nlweb Cloudflare Worker
 *
 * AI chat endpoint for UnifyOne / 1Commerce, deployed at:
 *   https://1commerce-nlweb.skdev-371.workers.dev
 *
 * Endpoints:
 *   GET  /              -> health/info
 *   GET  /health        -> { ok: true }
 *   POST /chat          -> streaming AI chat (Server-Sent Events)
 *   OPTIONS *           -> CORS preflight
 */

export interface Env {
  AI: Ai;
  DEFAULT_MODEL: string;
  ALLOWED_ORIGINS: string;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatRequestBody {
  messages?: ChatMessage[];
  message?: string;
  model?: string;
  stream?: boolean;
}

const DEFAULT_SYSTEM_PROMPT =
  "You are the 1Commerce assistant, a concise and helpful AI for an e-commerce SaaS platform. " +
  "Answer questions about products, orders, and the platform. If unsure, say so.";

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get("Origin") ?? "";
  const allowed = env.ALLOWED_ORIGINS.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0] ?? "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function jsonResponse(
  body: unknown,
  init: ResponseInit,
  request: Request,
  env: Env,
): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(request, env),
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}

function normalizeMessages(body: ChatRequestBody): ChatMessage[] {
  const msgs: ChatMessage[] = [];
  if (Array.isArray(body.messages) && body.messages.length > 0) {
    msgs.push(...body.messages);
  } else if (typeof body.message === "string" && body.message.trim()) {
    msgs.push({ role: "user", content: body.message });
  }
  if (!msgs.some((m) => m.role === "system")) {
    msgs.unshift({ role: "system", content: DEFAULT_SYSTEM_PROMPT });
  }
  return msgs;
}

async function handleChat(request: Request, env: Env): Promise<Response> {
  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return jsonResponse(
      { error: "Invalid JSON body" },
      { status: 400 },
      request,
      env,
    );
  }

  const messages = normalizeMessages(body);
  if (messages.filter((m) => m.role !== "system").length === 0) {
    return jsonResponse(
      { error: "Missing 'message' or 'messages'" },
      { status: 400 },
      request,
      env,
    );
  }

  const model = body.model ?? env.DEFAULT_MODEL;
  const wantStream = body.stream !== false;

  try {
    const result = await env.AI.run(model as keyof AiModels, {
      messages,
      stream: wantStream,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    if (wantStream && result instanceof ReadableStream) {
      return new Response(result, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          ...corsHeaders(request, env),
        },
      });
    }

    return jsonResponse({ result }, { status: 200 }, request, env);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    return jsonResponse({ error: message }, { status: 502 }, request, env);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request, env),
      });
    }

    if (url.pathname === "/health") {
      return jsonResponse({ ok: true }, { status: 200 }, request, env);
    }

    if (url.pathname === "/" && request.method === "GET") {
      return jsonResponse(
        {
          service: "1commerce-nlweb",
          endpoints: ["/health", "POST /chat"],
        },
        { status: 200 },
        request,
        env,
      );
    }

    if (url.pathname === "/chat" && request.method === "POST") {
      return handleChat(request, env);
    }

    return jsonResponse(
      { error: "Not Found" },
      { status: 404 },
      request,
      env,
    );
  },
} satisfies ExportedHandler<Env>;
