/**
 * Client for the 1commerce-nlweb Cloudflare Worker
 * (https://1commerce-nlweb.skdev-371.workers.dev).
 *
 * Streams Server-Sent Events emitted by Workers AI in the format:
 *   data: {"response":"hello"}
 *   data: [DONE]
 */

export type NlwebRole = "system" | "user" | "assistant";

export interface NlwebMessage {
  role: NlwebRole;
  content: string;
}

export interface NlwebChatRequest {
  messages: NlwebMessage[];
  model?: string;
  signal?: AbortSignal;
}

const DEFAULT_WORKER_URL = "https://1commerce-nlweb.skdev-371.workers.dev";

/**
 * Resolve the worker URL from Vite env, falling back to the production worker.
 * Trailing slashes are stripped so callers can append paths safely.
 */
export function getNlwebWorkerUrl(): string {
  const fromEnv = import.meta.env?.VITE_NLWEB_WORKER_URL as string | undefined;
  return (fromEnv && fromEnv.trim()) || DEFAULT_WORKER_URL;
}

/**
 * Parse the Workers-AI SSE wire format and yield raw text chunks.
 *
 * Each SSE event is a line beginning with `data: `, followed by either a JSON
 * object whose `response` field holds the next token, or the literal `[DONE]`
 * sentinel that terminates the stream.
 *
 * Exported for unit testing.
 */
export function parseSseChunks(raw: string): string[] {
  const out: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      const obj = JSON.parse(payload) as { response?: string };
      if (typeof obj.response === "string" && obj.response.length > 0) {
        out.push(obj.response);
      }
    } catch {
      // Non-JSON keep-alive / comment line — ignore
    }
  }
  return out;
}

/**
 * Stream a chat completion. Calls `onChunk` for each token of text as it
 * arrives and resolves with the full assembled response when the stream ends.
 */
export async function streamNlwebChat(
  req: NlwebChatRequest,
  onChunk: (delta: string) => void,
): Promise<string> {
  const res = await fetch(`${getNlwebWorkerUrl()}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: req.messages,
      model: req.model,
      stream: true,
    }),
    signal: req.signal,
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `nlweb chat failed: ${res.status} ${res.statusText} ${text}`.trim(),
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  // Read until end-of-stream, splitting by blank lines so we never parse a
  // partial SSE event.
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const event = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      for (const chunk of parseSseChunks(event)) {
        full += chunk;
        onChunk(chunk);
      }
    }
  }

  // Flush any trailing event without a terminating blank line.
  if (buffer.length > 0) {
    for (const chunk of parseSseChunks(buffer)) {
      full += chunk;
      onChunk(chunk);
    }
  }

  return full;
}
