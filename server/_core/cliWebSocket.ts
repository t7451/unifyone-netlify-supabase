/**
 * server/_core/cliWebSocket.ts
 *
 * WebSocket PTY relay for the in-website CLI.
 *
 * Endpoint: /api/cli/pty
 *
 * On upgrade:
 *   1. Verifies the JWT session cookie — rejects unauthenticated connections.
 *   2. Reads ?mode=platform|vps|local from the URL.
 *   3. Dispatches to the appropriate handler:
 *        platform — no external connection (commands go via tRPC cli.execute)
 *        vps      — SSH relay using `ssh2`
 *        local    — relay to the unifyone-agent via a one-time token
 *
 * Security:
 *   - JWT cookie validated on every upgrade; connection closed on failure.
 *   - Rate limit: max 60 messages per minute per user (in-memory token bucket).
 *   - Idle timeout: 15 minutes of inactivity terminates the session.
 *   - SSH private keys are decrypted server-side and never forwarded to the client.
 */

import type { IncomingMessage, Server } from "http";
import { parse as parseCookieHeader } from "cookie";
import { WebSocketServer, WebSocket } from "ws";
import type { Client as SshClient, ConnectConfig } from "ssh2";
import { COOKIE_NAME } from "@shared/const";
import { sdk } from "./sdk";
import { localAgentTokens } from "../routers/cli";
import { logger } from "./logger";
import { decryptCliKey } from "../lib/cliCrypto";

// ── Timeout / rate-limit constants ────────────────────────────────────────────

/** Maximum messages per user per minute before rate-limiting kicks in. */
const RATE_LIMIT_MAX_TOKENS = 60;
/** Rate-limit refill window in ms (1 minute). */
const RATE_LIMIT_REFILL_MS = 60_000;
/** Idle timeout for VPS/local PTY sessions (15 minutes). */
const VPS_IDLE_TIMEOUT_MS = 15 * 60 * 1000;
/** Idle timeout for platform-mode sessions (30 minutes). */
const PLATFORM_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
/** How long to wait for unifyone-agent to connect before giving up. */
const LOCAL_AGENT_CONNECT_TIMEOUT_MS = 30_000;

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuthenticatedUser {
  id: number;
  tenantId: number | null;
  openId: string;
}

interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

// ── Rate-limiter (in-memory token bucket, per userId) ─────────────────────────

const rateLimitBuckets = new Map<number, RateLimitBucket>();

function isRateLimited(userId: number): boolean {
  const now = Date.now();
  let bucket = rateLimitBuckets.get(userId);
  if (!bucket) {
    bucket = { tokens: RATE_LIMIT_MAX_TOKENS - 1, lastRefill: now };
    rateLimitBuckets.set(userId, bucket);
    return false;
  }
  // Refill if interval has passed
  if (now - bucket.lastRefill >= RATE_LIMIT_REFILL_MS) {
    bucket.tokens = RATE_LIMIT_MAX_TOKENS;
    bucket.lastRefill = now;
  }
  if (bucket.tokens <= 0) return true;
  bucket.tokens -= 1;
  return false;
}

// ── JWT authentication helper ─────────────────────────────────────────────────

async function authenticateUpgrade(
  req: IncomingMessage
): Promise<AuthenticatedUser | null> {
  try {
    const cookieHeader = req.headers.cookie ?? "";
    const cookies = parseCookieHeader(cookieHeader);
    const sessionCookie = cookies[COOKIE_NAME];
    if (!sessionCookie) return null;

    const session = await sdk.verifySession(sessionCookie);
    if (!session) return null;

    const { getUserByOpenId } = await import("../db");
    const user = await getUserByOpenId(session.openId);
    if (!user) return null;

    return { id: user.id, tenantId: user.tenantId ?? null, openId: user.openId };
  } catch {
    return null;
  }
}

// ── Message helpers ───────────────────────────────────────────────────────────

function send(ws: WebSocket, type: string, payload: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, payload }));
  }
}

function sendError(ws: WebSocket, message: string) {
  send(ws, "error", { message });
}

// ── VPS SSH relay ─────────────────────────────────────────────────────────────

async function handleVpsSession(
  ws: WebSocket,
  user: AuthenticatedUser,
  vpsId: string | undefined
) {
  if (!vpsId) {
    sendError(ws, "vpsId query parameter is required for VPS mode");
    ws.close(1008);
    return;
  }

  // Dynamically import ssh2 to avoid crashing when native module is missing
  let SshClientCtor: typeof SshClient;
  try {
    const { Client } = await import("ssh2");
    SshClientCtor = Client;
  } catch {
    sendError(ws, "SSH relay is not available in this environment");
    ws.close(1011);
    return;
  }

  // Retrieve connection details from the DB (decrypt private key server-side)
  const { getDb } = await import("../db");
  const { cliVpsConnections } = await import("../../drizzle/schema");
  const { eq, and } = await import("drizzle-orm");

  const db = await getDb();
  if (!db) {
    sendError(ws, "Database unavailable");
    ws.close(1011);
    return;
  }

  const rows = await db
    .select()
    .from(cliVpsConnections)
    .where(
      and(
        eq(cliVpsConnections.id, parseInt(vpsId, 10)),
        eq(cliVpsConnections.userId, user.id)
      )
    )
    .limit(1);

  if (!rows[0]) {
    sendError(ws, "VPS connection not found");
    ws.close(1008);
    return;
  }

  const conn = rows[0];

  // Decrypt private key using the shared AES-256-GCM helper
  let privateKey: string | undefined;
  if (conn.encryptedPrivateKey) {
    try {
      privateKey = decryptCliKey(conn.encryptedPrivateKey, user.id);
    } catch {
      sendError(ws, "Failed to decrypt VPS private key");
      ws.close(1011);
      return;
    }
  }

  const connectConfig: ConnectConfig = {
    host: conn.host,
    port: conn.port,
    username: conn.username,
    ...(privateKey ? { privateKey } : {}),
    readyTimeout: 15_000,
  };

  const ssh = new SshClientCtor();
  let idleTimer: ReturnType<typeof setTimeout>;

  function resetIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      send(ws, "info", { message: "Session closed due to inactivity." });
      ssh.end();
      ws.close(1000);
    }, VPS_IDLE_TIMEOUT_MS);
  }

  ssh.on("ready", () => {
    send(ws, "connected", { host: conn.host });
    resetIdle();

    ssh.shell({ term: "xterm-256color" }, (err, stream) => {
      if (err) {
        sendError(ws, `Shell error: ${err.message}`);
        ssh.end();
        ws.close(1011);
        return;
      }

      // ssh → browser
      stream.on("data", (chunk: Buffer) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(chunk);
        }
        resetIdle();
      });
      stream.stderr.on("data", (chunk: Buffer) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(chunk);
        }
      });
      stream.on("close", () => {
        clearTimeout(idleTimer);
        ws.close(1000);
      });

      // browser → ssh
      ws.on("message", (data: Buffer | string) => {
        if (isRateLimited(user.id)) {
          sendError(ws, "Rate limit exceeded (60 messages/min)");
          return;
        }
        resetIdle();
        // Resize control message: JSON { type: "resize", cols, rows }
        if (typeof data === "string") {
          try {
            const msg = JSON.parse(data) as { type?: string; cols?: number; rows?: number };
            if (msg.type === "resize" && msg.cols && msg.rows) {
              stream.setWindow(msg.rows, msg.cols, 0, 0);
            }
          } catch {
            // Not JSON — forward as raw text
            stream.write(data);
          }
        } else {
          stream.write(data);
        }
      });

      ws.on("close", () => {
        clearTimeout(idleTimer);
        stream.close();
        ssh.end();
      });
    });
  });

  ssh.on("error", err => {
    logger.warn("[cli/vps] SSH error", { error: err.message, host: conn.host });
    sendError(ws, `SSH error: ${err.message}`);
    ws.close(1011);
  });

  ssh.connect(connectConfig);
}

// ── Local agent relay ──────────────────────────────────────────────────────────

async function handleLocalSession(
  ws: WebSocket,
  user: AuthenticatedUser,
  agentToken: string | undefined
) {
  if (!agentToken) {
    sendError(ws, "agentToken query parameter is required for local mode");
    ws.close(1008);
    return;
  }

  const meta = localAgentTokens.get(agentToken);
  if (!meta || meta.userId !== user.id || meta.expiresAt < Date.now()) {
    localAgentTokens.delete(agentToken);
    sendError(ws, "Invalid or expired agent token");
    ws.close(1008);
    return;
  }
  localAgentTokens.delete(agentToken); // one-time use

  // The local agent (unifyone-agent) will connect outbound to
  // /api/cli/local-relay with the same token. We relay bidirectionally
  // between the two WebSocket connections.
  // Until the agent connects, we notify the browser.
  send(ws, "awaiting_agent", {
    message:
      "Waiting for unifyone-agent to connect on your local machine. " +
      "Run: unifyone-agent --token <token>",
  });

  // This stub closes with a clear message if the agent never connects.
  const timeout = setTimeout(() => {
    send(ws, "error", { message: "Local agent did not connect within 30 seconds." });
    ws.close(1000);
  }, LOCAL_AGENT_CONNECT_TIMEOUT_MS);

  ws.on("close", () => clearTimeout(timeout));
}

// ── Platform mode ─────────────────────────────────────────────────────────────

function handlePlatformSession(ws: WebSocket, _user: AuthenticatedUser) {
  // Platform mode: commands are executed server-side via the cli.execute tRPC
  // procedure. The WebSocket here is used only for the interactive feel —
  // commands still go through tRPC for full validation, history persistence,
  // and multi-tenant scoping. We confirm the connection and wait.
  send(ws, "connected", {
    mode: "platform",
    message:
      "UnifyOne Platform CLI ready. Type `help` for available commands.",
  });

  ws.on("message", () => {
    // Platform commands are dispatched by the client via cli.execute (tRPC).
    // This WebSocket is a presence/keepalive channel in platform mode.
    resetIdle();
  });

  let idleTimer: ReturnType<typeof setTimeout>;
  function resetIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      send(ws, "info", { message: "Session closed due to inactivity." });
      ws.close(1000);
    }, PLATFORM_IDLE_TIMEOUT_MS);
  }
  resetIdle();

  ws.on("close", () => clearTimeout(idleTimer));
}

// ── Main registrar ────────────────────────────────────────────────────────────

export function registerCliWebSocket(httpServer: Server) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on(
    "upgrade",
    (req: IncomingMessage, socket, head) => {
      const url = new URL(req.url ?? "/", "http://localhost");
      if (url.pathname !== "/api/cli/pty") return; // Not our endpoint

      wss.handleUpgrade(req, socket, head, async ws => {
        const user = await authenticateUpgrade(req);
        if (!user) {
          ws.send(
            JSON.stringify({ type: "error", payload: { message: "Unauthorized" } })
          );
          ws.close(1008);
          return;
        }

        const mode = (url.searchParams.get("mode") ?? "platform") as
          | "platform"
          | "vps"
          | "local";

        logger.info("[cli/ws] connection opened", {
          userId: user.id,
          tenantId: user.tenantId,
          mode,
        });

        try {
          if (mode === "vps") {
            const vpsId = url.searchParams.get("vpsId") ?? undefined;
            await handleVpsSession(ws, user, vpsId);
          } else if (mode === "local") {
            const agentToken = url.searchParams.get("agentToken") ?? undefined;
            await handleLocalSession(ws, user, agentToken);
          } else {
            handlePlatformSession(ws, user);
          }
        } catch (err) {
          logger.error("[cli/ws] unhandled error", {
            error: err instanceof Error ? err.message : String(err),
          });
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "error", payload: { message: "Internal server error" } }));
            ws.close(1011);
          }
        }

        ws.on("close", () => {
          logger.info("[cli/ws] connection closed", {
            userId: user.id,
            mode,
          });
        });
      });
    }
  );
}
