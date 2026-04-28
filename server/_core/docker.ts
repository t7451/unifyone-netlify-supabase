/**
 * Docker-aware backend utilities: health checks, readiness probes,
 * runtime metrics, and graceful shutdown handling.
 *
 * These are registered as raw Express routes (not tRPC) so that
 * container orchestrators (Docker HEALTHCHECK, Kubernetes probes,
 * load balancers) can call them without authentication.
 */
import type { Express, Request, Response } from "express";
import type { Server } from "http";
import fs from "fs";
import { getDb } from "../db";

// ── Runtime state ────────────────────────────────────────────────────────────

const startedAt = Date.now();
let isShuttingDown = false;
let activeConnections = 0;

/** Track active HTTP connections for graceful shutdown. */
export function trackConnection(delta: 1 | -1) {
  activeConnections += delta;
}

// ── Health / readiness responses ─────────────────────────────────────────────

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  uptime: number;
  timestamp: string;
  version: string;
  node: string;
  environment: string;
  container: boolean;
  checks: Record<string, { ok: boolean; latencyMs?: number; error?: string }>;
}

async function checkDatabase(): Promise<{
  ok: boolean;
  latencyMs: number;
  error?: string;
}> {
  const t0 = Date.now();
  try {
    const db = await getDb();
    if (!db)
      return {
        ok: false,
        latencyMs: Date.now() - t0,
        error: "no DATABASE_URL configured",
      };
    await db.execute("SELECT 1");
    return { ok: true, latencyMs: Date.now() - t0 };
  } catch (err) {
    // Sanitize: never return raw connection strings or internal DB error details.
    const rawMsg = String(err);
    const safeMsg = rawMsg
      .replace(/postgresql:\/\/[^)\s]*/gi, "postgresql://[redacted]")
      .replace(/password=[^\s&)]*/gi, "password=[redacted]")
      .substring(0, 200);
    return { ok: false, latencyMs: Date.now() - t0, error: safeMsg };
  }
}

function getMemoryUsage() {
  const mem = process.memoryUsage();
  return {
    rssBytes: mem.rss,
    heapUsedBytes: mem.heapUsed,
    heapTotalBytes: mem.heapTotal,
    externalBytes: mem.external,
    rssMb: Math.round(mem.rss / 1024 / 1024),
    heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
  };
}

function getCpuUsage() {
  const cpu = process.cpuUsage();
  return {
    userMicros: cpu.user,
    systemMicros: cpu.system,
  };
}

// ── Route handlers ───────────────────────────────────────────────────────────

/**
 * GET /api/health
 * Lightweight liveness probe — returns 200 if the process is running.
 * Used by Docker HEALTHCHECK and load balancers.
 */
function healthHandler(_req: Request, res: Response) {
  if (isShuttingDown) {
    res.status(503).json({ status: "shutting_down" });
    return;
  }
  res.json({
    status: "healthy",
    uptime: Math.floor((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
    container: isRunningInDocker(),
  });
}

/**
 * GET /api/ready
 * Readiness probe — returns 200 only when the database is reachable.
 * Orchestrators use this to decide whether to route traffic to this instance.
 */
async function readyHandler(_req: Request, res: Response) {
  if (isShuttingDown) {
    res.status(503).json({ status: "shutting_down" });
    return;
  }

  const dbCheck = await checkDatabase();
  const status: HealthStatus = {
    status: dbCheck.ok ? "healthy" : "degraded",
    uptime: Math.floor((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? "unknown",
    node: process.version,
    environment: process.env.NODE_ENV ?? "unknown",
    container: isRunningInDocker(),
    checks: { database: dbCheck },
  };

  res.status(dbCheck.ok ? 200 : 503).json(status);
}

/**
 * GET /api/metrics
 * Exposes runtime metrics: memory, CPU, uptime, active connections.
 * Useful for monitoring dashboards (Prometheus scraper, Datadog, etc.).
 *
 * Protected by ADMIN_API_KEY when set (required in production).
 * Pass the key via the `X-Admin-Key` request header.
 */
function metricsHandler(req: Request, res: Response) {
  const adminKey = process.env.ADMIN_API_KEY;

  if (adminKey) {
    // Key is configured — require it on every request
    const provided = req.headers["x-admin-key"];
    if (provided !== adminKey) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  } else if (process.env.NODE_ENV === "production") {
    // Production with no key configured — block to prevent accidental exposure
    res
      .status(403)
      .json({ error: "Metrics unavailable. Set ADMIN_API_KEY to enable." });
    return;
  }

  res.json({
    uptime: Math.floor((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
    pid: process.pid,
    activeConnections,
    memory: getMemoryUsage(),
    cpu: getCpuUsage(),
    node: process.version,
    platform: process.platform,
    arch: process.arch,
  });
}

// ── Docker detection ─────────────────────────────────────────────────────────

function isRunningInDocker(): boolean {
  try {
    // Check for .dockerenv file (standard Docker indicator)
    if (fs.existsSync("/.dockerenv")) return true;
    // Check cgroup for "docker" or "containerd"
    const cgroup = fs.readFileSync("/proc/1/cgroup", "utf8");
    return cgroup.includes("docker") || cgroup.includes("containerd");
  } catch {
    return false;
  }
}

// ── Registration ─────────────────────────────────────────────────────────────

/**
 * Register Docker-oriented health routes on the Express app.
 * Call this early in the startup sequence (before tRPC middleware).
 */
export function registerDockerRoutes(app: Express) {
  app.get("/health", healthHandler);
  app.get("/api/health", healthHandler);
  app.get("/api/ready", readyHandler);
  app.get("/api/metrics", metricsHandler);
}

// ── Graceful shutdown ────────────────────────────────────────────────────────

/**
 * Register SIGTERM / SIGINT handlers so Docker `stop` drains connections
 * before terminating the process. Typical Docker stop timeout is 10 s.
 */
export function registerGracefulShutdown(server: Server) {
  const shutdown = (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`[docker] Received ${signal} — draining connections…`);

    // Stop accepting new connections
    server.close(() => {
      console.log("[docker] All connections drained. Exiting.");
      process.exit(0);
    });

    // Force exit after 15 s to respect Docker's stop timeout
    setTimeout(() => {
      console.warn("[docker] Forced shutdown after timeout.");
      process.exit(1);
    }, 15_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
