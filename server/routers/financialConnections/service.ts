import { TRPCError } from "@trpc/server";
import * as repo from "./repo";
import * as providers from "./providers";
import { encryptionReady, openToken, sealToken } from "./crypto";

const scope = (connection: repo.Connection) =>
  `${connection.userId}:${connection.provider}:${connection.environment}:${connection.externalId}`;
function requireProvider(provider: providers.Provider) {
  if (!providers.providerReady(provider) || !encryptionReady())
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "This connection provider is not configured yet.",
    });
}
function connectionProvider(connection: repo.Connection) {
  if (connection.provider !== "plaid" && connection.provider !== "argyle")
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Unsupported connection.",
    });
  const provider: providers.Provider = connection.provider;
  if (
    !providers.providerCredentialsReady(provider) ||
    (provider === "plaid" && !encryptionReady())
  )
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "Provider credentials needed to manage this connection are unavailable.",
    });
  if (connection.environment !== providers.providerEnvironment(provider))
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "This connection belongs to a different provider environment.",
    });
  return {
    provider,
    environment: connection.environment as providers.ProviderEnvironment,
  };
}
export async function availability(userId: number) {
  let storageReady = false;
  try {
    await repo.listConnections(userId);
    storageReady = true;
  } catch {
    /* Setup is incomplete; never enable linking before persistence works. */
  }
  return {
    plaid: {
      configured:
        storageReady && providers.providerReady("plaid") && encryptionReady(),
      environment: safeEnvironment("plaid"),
    },
    argyle: {
      configured:
        storageReady && providers.providerReady("argyle") && encryptionReady(),
      environment: safeEnvironment("argyle"),
    },
  };
}
function safeEnvironment(provider: providers.Provider) {
  try {
    return providers.providerEnvironment(provider);
  } catch {
    return "unconfigured" as const;
  }
}
export async function list(userId: number) {
  return (await repo.listConnections(userId)).map(connection => ({
    id: connection.id,
    provider: connection.provider,
    environment: connection.environment,
    status: connection.status,
    accounts: connection.accounts,
    lastSyncedAt: connection.lastSyncedAt,
    consentAt: connection.consentAt,
  }));
}
export async function beginBank(userId: number) {
  requireProvider("plaid");
  await repo.listConnections(userId);
  return providers.plaidLinkToken(userId);
}
export async function completeBank(userId: number, publicToken: string) {
  requireProvider("plaid");
  await repo.database();
  const exchange = await providers.exchangePlaidToken(publicToken);
  const owner = `${userId}:plaid:${exchange.environment}:${exchange.externalId}`;
  try {
    const connection = await repo.createConnection(
      userId,
      "plaid",
      exchange.environment,
      exchange.externalId,
      sealToken(exchange.token, owner)
    );
    if (!connection)
      throw new TRPCError({
        code: "CONFLICT",
        message: "This bank connection is already linked.",
      });
    return { connectionId: connection.id };
  } catch (error) {
    // A newly exchanged token must not survive a failed local save.
    if (!(error instanceof TRPCError && error.code === "CONFLICT"))
      await providers
        .revokeProvider(
          "plaid",
          exchange.environment,
          exchange.externalId,
          exchange.token
        )
        .catch(() => undefined);
    throw error;
  }
}
export async function beginGig(userId: number) {
  requireProvider("argyle");
  const environment = providers.providerEnvironment("argyle");
  let connection = (await repo.listConnections(userId)).find(
    row => row.provider === "argyle" && row.environment === environment
  );
  if (!connection)
    connection = await repo.createConnection(userId, "argyle", environment);
  if (!connection)
    throw new TRPCError({
      code: "CONFLICT",
      message: "A gig connection is being created. Try again shortly.",
    });
  if (["disconnecting", "disconnect_failed"].includes(connection.status))
    throw new TRPCError({
      code: "CONFLICT",
      message: "Finish disconnecting this connection before linking again.",
    });
  const acquired = await repo.acquireLease(userId, connection.id);
  const { lease } = acquired;
  connection = acquired.connection;
  try {
    let token: string;
    if (connection.externalId)
      token = await providers.argyleUserToken(
        connection.externalId,
        environment
      );
    else {
      const created = await providers.createArgyleUser(userId);
      try {
        await repo.completeArgyle(userId, connection.id, created.externalId);
      } catch (error) {
        await providers
          .revokeProvider("argyle", environment, created.externalId)
          .catch(() => undefined);
        throw error;
      }
      token = created.token;
    }
    await repo.releaseLease(
      userId,
      connection.id,
      lease,
      connection.lastSyncedAt ? connection.status : "linking"
    );
    return {
      connectionId: connection.id,
      token,
      environment,
      flowId: process.env.ARGYLE_READ_ONLY_FLOW_ID!,
    };
  } catch (error) {
    await repo.releaseLease(userId, connection.id, lease, "sync_error");
    throw error;
  }
}
export async function sync(userId: number, connectionId: string) {
  const { connection, lease } = await repo.acquireLease(userId, connectionId);
  try {
    const { provider, environment } = connectionProvider(connection);
    if (!connection.externalId)
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Finish linking this connection first.",
      });
    const result =
      provider === "plaid"
        ? await providers.syncPlaid(
            openToken(connection.encryptedToken!, scope(connection)),
            environment,
            connection.cursor
          )
        : await providers.syncArgyle(connection.externalId, environment);
    return await repo.commitSync(userId, connectionId, lease, result);
  } catch (error) {
    await repo.releaseLease(
      userId,
      connectionId,
      lease,
      error instanceof providers.ProviderError && error.code === "reconnect"
        ? "needs_reconnect"
        : "sync_error"
    );
    throw error;
  }
}
export async function disconnect(userId: number, connectionId: string) {
  const { connection, lease } = await repo.acquireLease(
    userId,
    connectionId,
    true
  );
  try {
    const { provider, environment } = connectionProvider(connection);
    if (connection.externalId)
      await providers.revokeProvider(
        provider,
        environment,
        connection.externalId,
        provider === "plaid"
          ? openToken(connection.encryptedToken!, scope(connection))
          : undefined
      );
    await repo.deleteConnection(userId, connectionId);
    return { disconnected: true };
  } catch (error) {
    await repo.releaseLease(userId, connectionId, lease, "disconnect_failed");
    throw error;
  }
}
