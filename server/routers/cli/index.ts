/**
 * server/routers/cli/index.ts
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
 *
 * Transport only: procedures + zod schemas live here; the command handler,
 * token store and use-cases live in cli.service.ts and data access in
 * cli.repo.ts.
 */

import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import * as service from "./cli.service";

// Re-exported for the SSH/local-agent WebSocket relay in server/_core, which
// consumes the one-time token store directly.
export { localAgentTokens } from "./cli.service";

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
      return service.execute(ctx.user, input);
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
      return service.history(ctx.user, input);
    }),

  // ── VPS Connections ─────────────────────────────────────────────────────────

  /** List saved VPS connections for the current user. Private keys never returned. */
  vpsList: protectedProcedure.query(async ({ ctx }) => {
    return service.vpsList(ctx.user);
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
      return service.vpsRegister(ctx.user, input);
    }),

  /** Delete a saved VPS connection (user must own it). */
  vpsUnregister: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return service.vpsUnregister(ctx.user, input.id);
    }),

  // ── Local Agent Token ───────────────────────────────────────────────────────

  /**
   * Issue a short-lived one-time token (60 s TTL) for the local agent.
   * The browser forwards this token to ws://localhost:7271 so the agent
   * can verify the relay is bound to a real authenticated session.
   */
  issueLocalToken: protectedProcedure.mutation(({ ctx }) => {
    return service.issueLocalToken(ctx.user);
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
      return service.openSession(ctx.user, input);
    }),

  /** Close a CLI session row. */
  closeSession: protectedProcedure
    .input(z.object({ sessionId: z.number(), exitCode: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      return service.closeSession(ctx.user, input);
    }),

  /**
   * Retrieve the decrypted private key for a VPS connection.
   * Only returned to the originating user, immediately before an SSH relay.
   * The key is never stored in client state — the server uses it internally.
   */
  _getVpsKey: protectedProcedure
    .input(z.object({ vpsId: z.number() }))
    .query(async ({ ctx, input }) => {
      return service.getVpsKey(ctx.user, input.vpsId);
    }),
});
