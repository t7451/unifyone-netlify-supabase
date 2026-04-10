/**
 * server/_core/fetchContext.ts
 *
 * tRPC context factory for the Netlify fetch adapter.
 * Compatible with @trpc/server/adapters/fetch (no Express types).
 */
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "../../drizzle/schema";

export type TrpcContext = {
  req: Request;
  user: User | null;
};

export async function createFetchContext(
  opts: FetchCreateContextFnOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  try {
    const { sdk } = await import("./sdk");
    user = await sdk.authenticateRequest(opts.req as any);
  } catch {
    user = null;
  }
  return { req: opts.req, user };
}
