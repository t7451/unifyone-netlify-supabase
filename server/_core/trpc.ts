import {
  GIG_OPERATOR_FEATURES_DISABLED_ERR_MSG,
  NOT_ADMIN_ERR_MSG,
  UNAUTHED_ERR_MSG,
} from "@shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { getTenantPrimaryProduct } from "../db";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  // Prevent unexpected/internal errors (e.g. raw DB/SQL driver errors, whose
  // message can contain SQL text, schema, or connection detail) from leaking
  // to the client in production. Deliberate TRPCErrors (UNAUTHORIZED,
  // FORBIDDEN, BAD_REQUEST, TOO_MANY_REQUESTS, …) keep their safe, intentional
  // messages. The original error is still thrown and logged server-side.
  errorFormatter({ shape, error }) {
    if (
      process.env.NODE_ENV === "production" &&
      error.code === "INTERNAL_SERVER_ERROR"
    ) {
      return {
        ...shape,
        message: "Internal server error. Please try again.",
        data: { ...shape.data, stack: undefined },
      };
    }
    return shape;
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

/**
 * tenantProcedure — like protectedProcedure but additionally guarantees the
 * caller has a non-null `tenantId`. Use this for any procedure that reads or
 * writes tenant-scoped data; it surfaces the tenantId on `ctx` so callers
 * cannot forget to filter by it.
 *
 * IMPORTANT: this enforces the *presence* of a tenant context, not the
 * correctness of every query. Routers must still scope every DB read/write
 * by `ctx.tenantId`.
 */
/**
 * rateLimitedProcedure(limiter, scope) — wraps protectedProcedure with a
 * rate-limit check keyed on the authenticated user id. Throws TRPCError
 * TOO_MANY_REQUESTS when the limit is exceeded.
 *
 * Usage:
 *   import { mcpRateLimiter } from "./rateLimiter";
 *   const limited = rateLimitedProcedure(mcpRateLimiter, "mcp");
 *   limited.query(async () => { ... })
 */
type Limiter = {
  check(
    key: string
  ): Promise<{ allowed: true } | { allowed: false; retryAfterMs: number }>;
};

function throwRateLimitError(retryAfterMs: number, prefix: string) {
  throw new TRPCError({
    code: "TOO_MANY_REQUESTS",
    message: `${prefix} Retry in ${Math.ceil(retryAfterMs / 1000)}s.`,
  });
}

export function rateLimitedProcedure(limiter: Limiter, scope: string) {
  return protectedProcedure.use(
    t.middleware(async opts => {
      const { ctx, next } = opts;
      const key = `${scope}:${ctx.user!.id}`;
      const result = await limiter.check(key);
      if (!result.allowed) {
        throwRateLimitError(result.retryAfterMs, "Rate limit exceeded.");
      }
      return next();
    })
  );
}

/**
 * Resolve the client IP for rate-limit keying. Trusts X-Forwarded-For only
 * when present (Express's req.ip already honors `trust proxy`). Falls back
 * to the socket address. Never returns an empty string — defaults to "anon"
 * so a misconfigured proxy still gets a single shared bucket instead of
 * silently disabling the limiter.
 */
function clientKey(req: TrpcContext["req"]): string {
  const fwd = req.headers["x-forwarded-for"];
  const fwdStr = Array.isArray(fwd) ? fwd[0] : fwd;
  const first = fwdStr?.split(",")[0]?.trim();
  return first || req.ip || req.socket?.remoteAddress || "anon";
}

/**
 * protectedIpRateLimitedProcedure — for authenticated mutations where abuse is
 * best keyed on the caller's IP rather than the user id.
 */
export function protectedIpRateLimitedProcedure(
  limiter: Limiter,
  scope: string
) {
  return protectedProcedure.use(
    t.middleware(async opts => {
      const { ctx, next } = opts;
      const key = `${scope}:${clientKey(ctx.req)}`;
      const result = await limiter.check(key);
      if (!result.allowed) {
        throwRateLimitError(result.retryAfterMs, "Too many requests.");
      }
      return next();
    })
  );
}

/**
 * publicRateLimitedProcedure — like publicProcedure but checks `limiter`
 * keyed on the caller's IP. Use on public form endpoints (waitlists,
 * leads, analytics relays) where unauthenticated abuse is the threat.
 */
export function publicRateLimitedProcedure(limiter: Limiter, scope: string) {
  return t.procedure.use(
    t.middleware(async opts => {
      const { ctx, next } = opts;
      const key = `${scope}:${clientKey(ctx.req)}`;
      const result = await limiter.check(key);
      if (!result.allowed) {
        throwRateLimitError(result.retryAfterMs, "Too many requests.");
      }
      return next();
    })
  );
}

export const tenantProcedure = protectedProcedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    const tenantId = ctx.user?.tenantId;
    if (tenantId == null) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "No tenant context for this user",
      });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
        tenantId,
      },
    });
  })
);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  })
);

/**
 * operatorProcedure — gig-operator-gated procedure. Like protectedProcedure but
 * additionally requires the caller's tenant to lead with the gig product.
 * Users with no tenant yet are treated as operators (gig is the default
 * product), so onboarding is never blocked; commerce-primary tenants are
 * rejected with FORBIDDEN. Use this for gig-only subscription/billing logic so
 * commerce-first workspaces can't drive gig entitlement state. Fails open to
 * "gig" on lookup error (see getTenantPrimaryProduct).
 */
const requireOperator = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  if (ctx.user.tenantId != null) {
    const primaryProduct = await getTenantPrimaryProduct(ctx.user.tenantId);
    if (primaryProduct === "commerce") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: GIG_OPERATOR_FEATURES_DISABLED_ERR_MSG,
      });
    }
  }

  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const operatorProcedure = t.procedure.use(requireOperator);
