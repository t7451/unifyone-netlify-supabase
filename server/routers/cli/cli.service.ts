import { randomBytes } from "crypto";
import { TRPCError } from "@trpc/server";
import { logger } from "../../_core/logger";
import { encryptCliKey, decryptCliKey } from "../../lib/cliCrypto";
import {
  getDb,
  selectTenantStatus,
  selectTenant,
  selectRecentOrders,
  selectOrderById,
  selectActiveProducts,
  selectOrderTotals,
  selectWebhookEvents,
  insertCommandHistory,
  selectCommandHistory,
  selectVpsConnections,
  insertVpsConnection,
  deleteVpsConnection,
  selectVpsConnectionById,
  insertSession,
  closeSession as repoCloseSession,
} from "./cli.repo";

/**
 * Use-case layer for the in-website CLI router. Holds the platform command
 * handler, the local-agent token store, history persistence and the VPS /
 * session use-cases. Transport (procedures + zod) stays in index.ts; data
 * access in cli.repo.ts. Output strings and side-effect order are unchanged.
 */

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

export async function executePlatformCommand(
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

  if (!cmd)
    return { output: "Type `help` to list available commands.", exitCode: 0 };

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
      const result = await selectTenantStatus(db, tenantId);
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
        const result = await selectTenant(db, tenantId);
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
      return {
        output: `Unknown tenant subcommand: ${sub}. Try: tenant info`,
        exitCode: 1,
      };
    }

    // ── orders ───────────────────────────────────────────────────────────────
    case "orders": {
      if (!db || !tenantId) return { output: "No active tenant.", exitCode: 1 };

      if (sub === "list" || !sub) {
        const rows = await selectRecentOrders(db, tenantId);
        if (rows.length === 0)
          return { output: "No orders found.", exitCode: 0 };
        const lines = rows.map(
          o =>
            `#${o.orderNumber}  ${o.status.padEnd(12)}  $${String(o.total).padStart(8)}  ${new Date(o.createdAt).toISOString()}`
        );
        return {
          output: ["ID       Status        Total      Created", ...lines].join(
            "\n"
          ),
          exitCode: 0,
        };
      }

      if (sub === "get") {
        const id = parseInt(args[0] ?? "");
        if (isNaN(id)) return { output: "Usage: orders get <id>", exitCode: 1 };
        const rows = await selectOrderById(db, tenantId, id);
        if (!rows[0]) return { output: `Order #${id} not found.`, exitCode: 1 };
        return { output: JSON.stringify(rows[0], null, 2), exitCode: 0 };
      }

      return {
        output: `Unknown orders subcommand: ${sub}. Try: list | get <id>`,
        exitCode: 1,
      };
    }

    // ── products ─────────────────────────────────────────────────────────────
    case "products": {
      if (!db || !tenantId) return { output: "No active tenant.", exitCode: 1 };

      if (sub === "list" || !sub) {
        const rows = await selectActiveProducts(db, tenantId);
        if (rows.length === 0)
          return { output: "No active products found.", exitCode: 0 };
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
        const rows = await selectOrderTotals(db, tenantId);
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

      return {
        output: `Unknown analytics subcommand: ${sub}. Try: summary`,
        exitCode: 1,
      };
    }

    // ── logs ──────────────────────────────────────────────────────────────────
    case "logs": {
      if (!db || !tenantId) return { output: "No active tenant.", exitCode: 1 };

      const tailFlag = args.findIndex(a => a === "--tail");
      const limit = tailFlag >= 0 ? parseInt(args[tailFlag + 1] ?? "20") : 20;
      const safeLimit = isNaN(limit) || limit < 1 ? 20 : Math.min(limit, 100);

      const rows = await selectWebhookEvents(db, tenantId, safeLimit);
      if (rows.length === 0)
        return { output: "No webhook events found.", exitCode: 0 };
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

export async function persistHistory(
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
    await insertCommandHistory(db, {
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

// ── Procedure use-cases ───────────────────────────────────────────────────────

interface CallerUser {
  id: number;
  tenantId: number | null;
}

export async function execute(
  user: CallerUser,
  input: { command: string; sessionId?: number }
) {
  const result = await executePlatformCommand(
    input.command,
    user.id,
    user.tenantId
  );
  // Persist history (fire-and-forget)
  void persistHistory(
    user.id,
    user.tenantId,
    input.sessionId,
    input.command,
    result.output,
    result.exitCode
  );
  return result;
}

export async function history(
  user: CallerUser,
  input: { limit: number; offset: number }
) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const items = await selectCommandHistory(
    db,
    user.id,
    input.limit,
    input.offset
  );
  return { items };
}

export async function vpsList(user: CallerUser) {
  const db = await getDb();
  if (!db) return [];
  const rows = await selectVpsConnections(db, user.id);
  return rows.map(r => ({
    ...r,
    hasKey: !!r.hasKey,
  }));
}

export async function vpsRegister(
  user: CallerUser,
  input: {
    label: string;
    host: string;
    port: number;
    username: string;
    privateKey?: string;
  }
) {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "DB unavailable",
    });

  const encryptedPrivateKey = input.privateKey
    ? encryptCliKey(input.privateKey, user.id)
    : null;

  const result = await insertVpsConnection(db, {
    tenantId: user.tenantId ?? null,
    userId: user.id,
    label: input.label,
    host: input.host,
    port: input.port,
    username: input.username,
    encryptedPrivateKey,
  });
  return result[0];
}

export async function vpsUnregister(user: CallerUser, id: number) {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "DB unavailable",
    });
  await deleteVpsConnection(db, user.id, id);
  return { success: true };
}

export function issueLocalToken(user: CallerUser) {
  const token = randomBytes(24).toString("hex");
  localAgentTokens.set(token, {
    userId: user.id,
    tenantId: user.tenantId ?? null,
    expiresAt: Date.now() + 60_000,
  });
  return { token, expiresIn: 60 };
}

export async function openSession(
  user: CallerUser,
  input: { mode: "platform" | "vps" | "local"; vpsId?: number }
) {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "DB unavailable",
    });
  const result = await insertSession(db, {
    userId: user.id,
    tenantId: user.tenantId ?? null,
    mode: input.mode,
    vpsId: input.vpsId ?? null,
  });
  return { sessionId: result[0].id };
}

export async function closeSession(
  user: CallerUser,
  input: { sessionId: number; exitCode?: number }
) {
  const db = await getDb();
  if (!db) return { success: false };
  await repoCloseSession(db, user.id, input.sessionId, input.exitCode ?? 0);
  return { success: true };
}

export async function getVpsKey(user: CallerUser, vpsId: number) {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "DB unavailable",
    });
  const rows = await selectVpsConnectionById(db, user.id, vpsId);
  if (!rows[0])
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "VPS connection not found",
    });
  const row = rows[0];
  const privateKey = row.encryptedPrivateKey
    ? decryptCliKey(row.encryptedPrivateKey, user.id)
    : null;
  return {
    host: row.host,
    port: row.port,
    username: row.username,
    privateKey,
  };
}
