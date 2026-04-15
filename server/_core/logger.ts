/**
 * Structured JSON logger for UnifyOne server.
 *
 * Outputs one JSON object per line to stdout (prod) or pretty-printed to
 * stdout (dev). Each line is parseable by Datadog, CloudWatch, Logtail, etc.
 *
 * Usage:
 *   import { logger } from "./_core/logger";
 *   logger.info("User signed in", { openId, ip });
 *   logger.warn("Rate limit hit", { ip, endpoint });
 *   logger.error("Stripe webhook failed", { eventType, error: errMsg(err) });
 *
 * The optional `requestId` field threads a per-request ID through all log
 * lines in a single request via AsyncLocalStorage (see withRequestId).
 */

import { AsyncLocalStorage } from "node:async_hooks";

// ── Request ID context ───────────────────────────────────────────────────────

const requestIdStore = new AsyncLocalStorage<string>();

export function withRequestId<T>(id: string, fn: () => T): T {
  return requestIdStore.run(id, fn);
}

function currentRequestId(): string | undefined {
  return requestIdStore.getStore();
}

// ── Log levels ───────────────────────────────────────────────────────────────

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_NUM: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

// Minimum level to emit. Override via LOG_LEVEL env var.
const minLevel: number =
  LEVEL_NUM[(process.env.LOG_LEVEL?.toLowerCase() as Level) ?? "info"] ??
  LEVEL_NUM.info;

const isDev = process.env.NODE_ENV !== "production";

// ── Core emit function ────────────────────────────────────────────────────────

function emit(level: Level, message: string, meta?: Record<string, unknown>) {
  if (LEVEL_NUM[level] < minLevel) return;

  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...(currentRequestId() ? { requestId: currentRequestId() } : {}),
    ...meta,
  };

  if (isDev) {
    // Pretty-print in development for readability in terminal
    const metaStr =
      meta && Object.keys(meta).length > 0 ? " " + JSON.stringify(meta) : "";
    const prefix =
      level === "error"
        ? "\x1b[31m[ERROR]\x1b[0m"
        : level === "warn"
          ? "\x1b[33m[WARN]\x1b[0m"
          : level === "debug"
            ? "\x1b[90m[DEBUG]\x1b[0m"
            : "\x1b[36m[INFO]\x1b[0m";
    console.log(`${prefix} ${message}${metaStr}`);
  } else {
    // One JSON line per log event — parseable by any log aggregator
    process.stdout.write(JSON.stringify(entry) + "\n");
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) =>
    emit("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) =>
    emit("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) =>
    emit("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) =>
    emit("error", msg, meta),
};

// ── Express request-logging middleware ────────────────────────────────────────

import type { Request, Response, NextFunction } from "express";
import { randomBytes } from "node:crypto";

/**
 * Attaches a `X-Request-Id` header and logs every request + response.
 * Plug in early in the Express middleware chain:
 *
 *   app.use(requestLogger);
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId =
    (req.headers["x-request-id"] as string) || randomBytes(8).toString("hex");

  res.setHeader("X-Request-Id", requestId);

  const start = Date.now();

  withRequestId(requestId, () => {
    logger.info("→ request", {
      method: req.method,
      path: req.path,
      ip: req.ip ?? req.socket.remoteAddress,
    });

    res.on("finish", () => {
      const ms = Date.now() - start;
      const level: Level =
        res.statusCode >= 500
          ? "error"
          : res.statusCode >= 400
            ? "warn"
            : "info";
      logger[level]("← response", {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ms,
      });
    });

    next();
  });
}
