import pino from "pino";

// Scrubs obvious secret-shaped values so a stray credential never lands in a
// spire_runs.log row or a Netlify function log.
const SECRET_REDACT_PATTERNS: RegExp[] = [
  /sk-ant-[A-Za-z0-9_-]+/g, // Anthropic
  /ghp_[A-Za-z0-9]+/g, // GitHub fine-grained PAT
  /github_pat_[A-Za-z0-9_]+/g, // GitHub fine-grained PAT (prefixed)
  /ml-[A-Za-z0-9]{32,}/g, // MailerLite
  /postgres(?:ql)?:\/\/[^\s]+/g, // full Neon URLs
];

function redact(input: unknown): unknown {
  if (typeof input === "string") {
    let out = input;
    for (const re of SECRET_REDACT_PATTERNS) {
      out = out.replace(re, "[REDACTED]");
    }
    return out;
  }
  if (Array.isArray(input)) return input.map(redact);
  if (input && typeof input === "object") {
    const o = input as Record<string, unknown>;
    const copy: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) {
      const lower = k.toLowerCase();
      if (
        lower.includes("token") ||
        lower.includes("secret") ||
        lower.includes("api_key") ||
        lower.includes("apikey") ||
        lower.includes("password")
      ) {
        copy[k] = "[REDACTED]";
      } else {
        copy[k] = redact(v);
      }
    }
    return copy;
  }
  return input;
}

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: [
      "*.token",
      "*.apiKey",
      "*.api_key",
      "*.secret",
      "*.password",
      "*.authorization",
    ],
    censor: "[REDACTED]",
  },
  formatters: {
    log(obj) {
      return redact(obj) as Record<string, unknown>;
    },
  },
  transport: process.stdout.isTTY
    ? {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "HH:MM:ss" },
      }
    : undefined,
});

// Helper: scrub arbitrary data for safe storage in spire_runs.log
export function scrubForStorage(data: unknown): unknown {
  return redact(data);
}
