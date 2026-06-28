/**
 * server/routers/apiKeys/apiKeys.service.ts
 *
 * Use-case logic for user-scoped provider API keys: list (masked), save
 * (with live validation), and remove. Live key validation against the
 * provider lives here.
 *
 * Behavior is identical to the original apiKeys router.
 */
import { TRPCError } from "@trpc/server";
import type { ApiKeyProvider } from "../../lib/userApiKeys";
import { apiKeysRepo } from "./apiKeys.repo";

/** Validate an OpenRouter key with a cheap authenticated call. */
async function validateOpenRouterKey(key: string): Promise<{
  valid: boolean;
  detail?: string;
}> {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/key", {
      headers: { authorization: `Bearer ${key}` },
    });
    if (response.ok) return { valid: true };
    return {
      valid: false,
      detail: `OpenRouter rejected the key (HTTP ${response.status}).`,
    };
  } catch (error) {
    return {
      valid: false,
      detail:
        error instanceof Error
          ? `Could not reach OpenRouter: ${error.message}`
          : "Could not reach OpenRouter.",
    };
  }
}

/** List the user's stored provider keys (masked — last 4 chars only). */
export async function list(userId: number) {
  const keys = await apiKeysRepo.listUserApiKeys(userId);
  return { keys };
}

/** Save (or replace) a provider key after validating it live. */
export async function save(
  userId: number,
  tenantId: number | null,
  input: { provider: ApiKeyProvider; key: string }
) {
  const validation = await validateOpenRouterKey(input.key);
  if (!validation.valid) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: validation.detail ?? "The API key failed validation.",
    });
  }
  const saved = await apiKeysRepo.upsertUserApiKey({
    userId,
    tenantId,
    provider: input.provider,
    key: input.key,
  });
  return { saved };
}

/** Remove a stored provider key. */
export async function remove(
  userId: number,
  input: { provider: ApiKeyProvider }
) {
  await apiKeysRepo.deleteUserApiKey({
    userId,
    provider: input.provider,
  });
  return { success: true };
}
