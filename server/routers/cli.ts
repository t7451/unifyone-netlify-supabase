/**
 * server/routers/cli.ts
 *
 * In-website CLI tRPC router.
 *
 * Supports three execution modes:
 *   platform  — built-in commands that call existing tRPC/DB helpers directly
 *   vps       — SSH relay via WebSocket (handled separately in index.ts)
 *   local     — relay to unifyone-agent running on localhost (one-time token)
 *
 * Procedures:
 *   cli.execute        — run a built-in platform command, returns output
 *   cli.history        — paginated command history for the current user
 *   cli.vpsRegister    — save a new VPS connection
 *   cli.vpsUnregister  — delete a saved VPS connection
 *   cli.vpsList        — list saved VPS connections (keys never returned)
 *   cli.issueLocalToken — generate a short-lived one-time token for the local agent
 */

import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  cliCommandHistory,
  cliSessions,
  cliVpsConnections,
  orders,
  products,
  tenants,
  webhookEvents,
} from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { logger } from "../_core/logger";

// ── Encryption helpers for VPS private keys ──────────────────────────────────

const ALGORITHM = "aes-256-gcm";

/** Derive a 32-byte key from the app secret + a per-user salt. */
function deriveKeyMaterial(userId: number): Buffer {
  return createHmac("sha256", ENV.cookieSecret)
    .update(`cli-key-${userId}`)
    .digest();
}

/** AES-256-GCM encrypt a private key string. Returns `iv:authTag:ciphertext` (all hex). */
function encryptPrivateKey(plaintext: string, userId: number): string {
  const key = deriveKeyMaterial(userId);
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/** Decrypt a previously encrypted private key string. */
function decryptPrivateKey(encryptedStr: string, userId: number): string {
  const parts = encryptedStr.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted key format");
  const [ivHex, authTagHex, ciphertextHex] = parts;
  const key = deriveKeyMaterial(userId);
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  return (
    decipher.update(Buffer.from(ciphertextHex, "hex")).toString("utf8") +
    decipher.final("utf8")
  );
}

// ── In-memory one-time token store for local agent ────────────────────────────
// Maps token → { userId, tenantId, expiresAt }
export const localAgentTokens = new Map<
  string,
  { userId: number; tenantId: number | null; expiresAt: number }
>();

/** Remove expired tokens periodically. */
setInterval(
  () => {
    const now = Date.now();
    for (const [token, meta] of Array.from(localAgentTokens.entries())) {
      if (meta.expiresAt < now) localAgentTokens.delete(token);
    }
  },
  30_000 // every 30 s
);

// ── Built-in platform command handler ─────────────────────────────────────────

type CommandResult = { output: string; exitCode: number };

async function executePlatformCommand(
  command: string,
  userId: number,
  tenantId: number | null | undefined
): Promise<CommandResult> {
  const db = await getDb();
  const parts = command
    .trim()
    .split(/\s+/)
    .filter(p => p.length > 0);
  const [cmd, sub, ...args] = parts;

  if (!cmd) return { output: "Type `help` to list available commands.", exitCode: 0 };

  switch (cmd.toLowerCase()) {
    // ── help ─────────────────────────────────────────────────────────────────
    case "help": {
      const text = [
        "Available commands:",
        "  help                       — show this message",
        "  status                     — platform health & subscription status",
        "  tenant info                — current tenant metadata",
        "  orders list                — list recent orders (last 10)",
        "  orders get <id>            — get order by ID",
        "  products list              — list active products (first 10)",
        "  analytics summary          — revenue / order counts (last 30 days)",
        "  logs [--tail <n>]          — recent webhook events",
        "  clear                      — clear terminal output",
      ].join("\n");
      return { output: text, exitCode: 0 };
    }

    // ── status ───────────────────────────────────────────────────────────────
    case "status": {
      if (!db || !tenantId) {
        return {
          output: "No active tenant. Run `tenant info` after completing setup.",
          exitCode: 1,
        };
      }
      const result = await db
        .select({
          name: tenants.name,
          status: tenants.status,
          subscriptionStatus: tenants.subscriptionStatus,
        })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);
      if (!result[0]) return { output: "Tenant not found.", exitCode: 1 };
      const t = result[0];
      return {
        output: [
          `Platform:            online`,
          `Tenant:              ${t.name}`,
          `Status:              ${t.status}`,
          `Subscription:        ${t.subscriptionStatus}`,
        ].join("\n"),
        exitCode: 0,
      };
    }

    // ── tenant ───────────────────────────────────────────────────────────────
    case "tenant": {
      if (sub === "info" || !sub) {
        if (!db || !tenantId) {
          return { output: "No active tenant.", exitCode: 1 };
        }
        const result = await db
          .select()
          .from(tenants)
          .where(eq(tenants.id, tenantId))
          .limit(1);
        if (!result[0]) return { output: "Tenant not found.", exitCode: 1 };
        const t = result[0];
        return {
          output: JSON.stringify(
            {
              id: t.id,
              name: t.name,
              slug: t.slug,
              domain: t.domain,
              status: t.status,
              subscriptionStatus: t.subscriptionStatus,
              createdAt: t.createdAt,
            },
            null,
            2
          ),
          exitCode: 0,
        };
      }
      return { output: `Unknown tenant subcommand: ${sub}. Try: tenant info`, exitCode: 1 };
    }

    // ── orders ───────────────────────────────────────────────────────────────
    case "orders": {
      if (!db || !tenantId) return { output: "No active tenant.", exitCode: 1 };

      if (sub === "list" || !sub) {
        const rows = await db
          .select({
            id: orders.id,
            orderNumber: orders.orderNumber,
            status: orders.status,
            total: orders.total,
            createdAt: orders.createdAt,
          })
          .from(orders)
          .where(eq(orders.tenantId, tenantId))
          .orderBy(desc(orders.createdAt))
          .limit(10);
        if (rows.length === 0) return { output: "No orders found.", exitCode: 0 };
        const lines = rows.map(
          o =>
            `#${o.orderNumber}  ${o.status.padEnd(12)}  $${String(o.total).padStart(8)}  ${new Date(o.createdAt).toISOString()}`
        );
        return {
          output: ["ID       Status        Total      Created", ...lines].join("\n"),
          exitCode: 0,
        };
      }

      if (sub === "get") {
        const id = parseInt(args[0] ?? "");
        if (isNaN(id)) return { output: "Usage: orders get <id>", exitCode: 1 };
        const rows = await db
          .select()
          .from(orders)
          .where(and(eq(orders.tenantId, tenantId), eq(orders.id, id)))
          .limit(1);
        if (!rows[0]) return { output: `Order #${id} not found.`, exitCode: 1 };
        return { output: JSON.stringify(rows[0], null, 2), exitCode: 0 };
      }

      return { output: `Unknown orders subcommand: ${sub}. Try: list | get <id>`, exitCode: 1 };
    }

    // ── products ─────────────────────────────────────────────────────────────
    case "products": {
      if (!db || !tenantId) return { output: "No active tenant.", exitCode: 1 };

      if (sub === "list" || !sub) {
        const rows = await db
          .select({
            id: products.id,
            name: products.name,
            price: products.price,
            status: products.status,
          })
          .from(products)
          .where(and(eq(products.tenantId, tenantId), eq(products.status, "active")))
          .limit(10);
        if (rows.length === 0) return { output: "No active products found.", exitCode: 0 };
        const lines = rows.map(
          p => `[${p.id}] ${p.name.padEnd(40)} $${p.price}  (${p.status})`
        );
        return { output: lines.join("\n"), exitCode: 0 };
      }

      return {
        output: `Unknown products subcommand: ${sub}. Try: list`,
        exitCode: 1,
      };
    }

    // ── analytics ────────────────────────────────────────────────────────────
    case "analytics": {
      if (!db || !tenantId) return { output: "No active tenant.", exitCode: 1 };

      if (sub === "summary" || !sub) {
        const rows = await db
          .select({
            total: orders.total,
            status: orders.status,
          })
          .from(orders)
          .where(eq(orders.tenantId, tenantId));
        const totalRevenue = rows.reduce(
          (acc, r) => acc + parseFloat(String(r.total ?? "0")),
          0
        );
        const orderCount = rows.length;
        return {
          output: [
            `Orders:        ${orderCount}`,
            `Total Revenue: $${totalRevenue.toFixed(2)}`,
          ].join("\n"),
          exitCode: 0,
        };
      }

      return { output: `Unknown analytics subcommand: ${sub}. Try: summary`, exitCode: 1 };
    }

    // ── logs ──────────────────────────────────────────────────────────────────
    case "logs": {
      if (!db || !tenantId) return { output: "No active tenant.", exitCode: 1 };

      const tailFlag = args.findIndex(a => a === "--tail");
      const limit = tailFlag >= 0 ? parseInt(args[tailFlag + 1] ?? "20") : 20;
      const safeLimit = isNaN(limit) || limit < 1 ? 20 : Math.min(limit, 100);

      const rows = await db
        .select({
          id: webhookEvents.id,
          source: webhookEvents.source,
          eventType: webhookEvents.eventType,
          status: webhookEvents.status,
          createdAt: webhookEvents.createdAt,
        })
        .from(webhookEvents)
        .where(eq(webhookEvents.tenantId, tenantId))
        .orderBy(desc(webhookEvents.createdAt))
        .limit(safeLimit);
      if (rows.length === 0) return { output: "No webhook events found.", exitCode: 0 };
      const lines = rows.map(
        e =>
          `[${new Date(e.createdAt).toISOString()}] ${e.source.padEnd(10)} ${e.eventType.padEnd(30)} ${e.status}`
      );
      return { output: lines.join("\n"), exitCode: 0 };
    }

    // ── clear ─────────────────────────────────────────────────────────────────
    case "clear":
      return { output: "\x1bc", exitCode: 0 };

    default:
      return {
        output: `Command not found: ${cmd}\nType \`help\` to list available commands.`,
        exitCode: 127,
      };
  }
}

// ── Persist command history ───────────────────────────────────────────────────

async function persistHistory(
  userId: number,
  tenantId: number | null | undefined,
  sessionId: number | undefined,
  command: string,
  output: string,
  exitCode: number
) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(cliCommandHistory).values({
      userId,
      tenantId: tenantId ?? null,
      sessionId: sessionId ?? null,
      command,
      output,
      exitCode,
    });
  } catch (err) {
    logger.warn("[cli] Failed to persist command history", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ── Router ────────────────────────────────────────────────────────────────────

export const cliRouter = router({
  /**
   * Execute a built-in platform command.
   * Returns structured { output, exitCode }.
   */
  execute: protectedProcedure
    .input(
      z.object({
        command: z.string().min(1).max(500),
        sessionId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await executePlatformCommand(
        input.command,
        ctx.user.id,
        ctx.user.tenantId
      );
      // Persist history (fire-and-forget)
      void persistHistory(
        ctx.user.id,
        ctx.user.tenantId,
        input.sessionId,
        input.command,
        result.output,
        result.exitCode
      );
      return result;
    }),

  /**
   * Retrieve paginated command history for the current user.
   */
  history: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0 };
      const items = await db
        .select()
        .from(cliCommandHistory)
        .where(eq(cliCommandHistory.userId, ctx.user.id))
        .orderBy(desc(cliCommandHistory.executedAt))
        .limit(input.limit)
        .offset(input.offset);
      return { items };
    }),

  // ── VPS Connections ─────────────────────────────────────────────────────────

  /** List saved VPS connections for the current user. Private keys never returned. */
  vpsList: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db
      .select({
        id: cliVpsConnections.id,
        label: cliVpsConnections.label,
        host: cliVpsConnections.host,
        port: cliVpsConnections.port,
        username: cliVpsConnections.username,
        hasKey: cliVpsConnections.encryptedPrivateKey,
        createdAt: cliVpsConnections.createdAt,
      })
      .from(cliVpsConnections)
      .where(eq(cliVpsConnections.userId, ctx.user.id));
    return rows.map(r => ({
      ...r,
      hasKey: !!r.hasKey,
    }));
  }),

  /** Save a new VPS connection. Private key is encrypted before storing. */
  vpsRegister: protectedProcedure
    .input(
      z.object({
        label: z.string().min(1).max(100),
        host: z.string().min(1).max(255),
        port: z.number().min(1).max(65535).default(22),
        username: z.string().min(1).max(64),
        /** PEM-encoded private key — encrypted before persisting. */
        privateKey: z.string().max(8192).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const encryptedPrivateKey = input.privateKey
        ? encryptPrivateKey(input.privateKey, ctx.user.id)
        : null;

      const result = await db
        .insert(cliVpsConnections)
        .values({
          tenantId: ctx.user.tenantId ?? null,
          userId: ctx.user.id,
          label: input.label,
          host: input.host,
          port: input.port,
          username: input.username,
          encryptedPrivateKey,
        })
        .returning({
          id: cliVpsConnections.id,
          label: cliVpsConnections.label,
          host: cliVpsConnections.host,
          port: cliVpsConnections.port,
          username: cliVpsConnections.username,
        });
      return result[0];
    }),

  /** Delete a saved VPS connection (user must own it). */
  vpsUnregister: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db
        .delete(cliVpsConnections)
        .where(
          and(
            eq(cliVpsConnections.id, input.id),
            eq(cliVpsConnections.userId, ctx.user.id)
          )
        );
      return { success: true };
    }),

  // ── Local Agent Token ───────────────────────────────────────────────────────

  /**
   * Issue a short-lived one-time token (60 s TTL) for the local agent.
   * The browser forwards this token to ws://localhost:7271 so the agent
   * can verify the relay is bound to a real authenticated session.
   */
  issueLocalToken: protectedProcedure.mutation(({ ctx }) => {
    const token = randomBytes(24).toString("hex");
    localAgentTokens.set(token, {
      userId: ctx.user.id,
      tenantId: ctx.user.tenantId ?? null,
      expiresAt: Date.now() + 60_000,
    });
    return { token, expiresIn: 60 };
  }),

  // ── Session management ──────────────────────────────────────────────────────

  /** Open a new CLI session row and return its ID. */
  openSession: protectedProcedure
    .input(
      z.object({
        mode: z.enum(["platform", "vps", "local"]).default("platform"),
        vpsId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const result = await db
        .insert(cliSessions)
        .values({
          userId: ctx.user.id,
          tenantId: ctx.user.tenantId ?? null,
          mode: input.mode,
          vpsId: input.vpsId ?? null,
        })
        .returning({ id: cliSessions.id });
      return { sessionId: result[0].id };
    }),

  /** Close a CLI session row. */
  closeSession: protectedProcedure
    .input(z.object({ sessionId: z.number(), exitCode: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db
        .update(cliSessions)
        .set({ endedAt: new Date(), exitCode: input.exitCode ?? 0 })
        .where(
          and(
            eq(cliSessions.id, input.sessionId),
            eq(cliSessions.userId, ctx.user.id)
          )
        );
      return { success: true };
    }),

  /**
   * Retrieve the decrypted private key for a VPS connection.
   * Only returned to the originating user, immediately before an SSH relay.
   * The key is never stored in client state — the server uses it internally.
   */
  _getVpsKey: protectedProcedure
    .input(z.object({ vpsId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const rows = await db
        .select()
        .from(cliVpsConnections)
        .where(
          and(
            eq(cliVpsConnections.id, input.vpsId),
            eq(cliVpsConnections.userId, ctx.user.id)
          )
        )
        .limit(1);
      if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "VPS connection not found" });
      const row = rows[0];
      const privateKey = row.encryptedPrivateKey
        ? decryptPrivateKey(row.encryptedPrivateKey, ctx.user.id)
        : null;
      return {
        host: row.host,
        port: row.port,
        username: row.username,
        privateKey,
      };
    }),
});
