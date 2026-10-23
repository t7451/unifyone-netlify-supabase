import { z } from "zod";

export type Provider = "plaid" | "argyle";
export type ProviderEnvironment = "sandbox" | "production";
export type SourceAccount = {
  id: string;
  name: string;
  mask?: string;
  state: string;
  balance?: number | null;
  currency?: string | null;
};
export type Activity = {
  providerRecordId: string;
  sourceAccountId: string;
  kind: "bank_transaction" | "gig_earning" | "income_payment";
  date: string;
  description: string;
  amount: string;
  currency: string;
  pending: boolean;
  durationSeconds: number | null;
};
export type SyncResult = {
  accounts: SourceAccount[];
  records: Activity[];
  removed: string[];
  cursor: string | null;
  replace: boolean;
};
export class ProviderError extends Error {
  constructor(
    public readonly code:
      | "unavailable"
      | "reconnect"
      | "restart"
      | "invalid_data" = "unavailable"
  ) {
    super(
      code === "reconnect"
        ? "This connection needs to be linked again."
        : "The data provider could not complete this request. Your previous data is unchanged."
    );
  }
}

export function providerEnvironment(provider: Provider): ProviderEnvironment {
  const value =
    process.env[provider === "plaid" ? "PLAID_ENV" : "ARGYLE_ENV"] ?? "sandbox";
  if (value !== "sandbox" && value !== "production") throw new ProviderError();
  return value;
}
export function providerCredentialsReady(provider: Provider) {
  try {
    providerEnvironment(provider);
    return provider === "plaid"
      ? !!process.env.PLAID_CLIENT_ID && !!process.env.PLAID_SECRET
      : !!process.env.ARGYLE_API_KEY && !!process.env.ARGYLE_API_SECRET;
  } catch {
    return false;
  }
}
export function providerReady(provider: Provider) {
  return (
    providerCredentialsReady(provider) &&
    (provider === "plaid" || !!process.env.ARGYLE_READ_ONLY_FLOW_ID)
  );
}
const origins = {
  plaid: {
    sandbox: "https://sandbox.plaid.com",
    production: "https://production.plaid.com",
  },
  argyle: {
    sandbox: "https://api-sandbox.argyle.com",
    production: "https://api.argyle.com",
  },
};
const plaidPaths = new Set([
  "/link/token/create",
  "/item/public_token/exchange",
  "/accounts/get",
  "/transactions/sync",
  "/item/remove",
]);

async function request(
  provider: Provider,
  environment: ProviderEnvironment,
  path: string,
  method: "GET" | "POST" | "DELETE",
  body?: Record<string, unknown>,
  deadline = Date.now() + 180_000
): Promise<unknown> {
  const origin = origins[provider][environment];
  const url = new URL(path, origin);
  // Never follow provider pagination URLs to arbitrary destinations or write APIs.
  if (
    url.origin !== origin ||
    (provider === "plaid"
      ? !plaidPaths.has(url.pathname) || method !== "POST"
      : !(
          (method === "GET" &&
            ["/v2/accounts", "/v2/gigs", "/v2/paystubs"].includes(
              url.pathname
            )) ||
          (method === "POST" &&
            ["/v2/users", "/v2/user-tokens"].includes(url.pathname)) ||
          (method === "DELETE" &&
            /^\/v2\/users\/[a-zA-Z\d-]+$/.test(url.pathname))
        ))
  )
    throw new ProviderError("invalid_data");
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new ProviderError();
  try {
    const response = await fetch(url, {
      method,
      redirect: "error",
      signal: AbortSignal.timeout(Math.min(10_000, remaining)),
      headers: {
        "Content-Type": "application/json",
        ...(provider === "plaid"
          ? { "Plaid-Version": "2020-09-14" }
          : {
              Authorization: `Basic ${Buffer.from(`${process.env.ARGYLE_API_KEY}:${process.env.ARGYLE_API_SECRET}`).toString("base64")}`,
            }),
      },
      body:
        method === "POST"
          ? JSON.stringify(
              provider === "plaid"
                ? {
                    ...body,
                    client_id: process.env.PLAID_CLIENT_ID,
                    secret: process.env.PLAID_SECRET,
                  }
                : (body ?? {})
            )
          : undefined,
    });
    if (method === "DELETE" && [204, 404].includes(response.status)) return {};
    const data: unknown = await response.json();
    if (!response.ok) {
      const code = z
        .object({ error_code: z.string().optional() })
        .safeParse(data);
      if (
        code.success &&
        code.data.error_code === "TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION"
      )
        throw new ProviderError("restart");
      if (
        code.success &&
        ["ITEM_LOGIN_REQUIRED", "INVALID_ACCESS_TOKEN"].includes(
          code.data.error_code ?? ""
        )
      )
        throw new ProviderError("reconnect");
      throw new ProviderError();
    }
    return data;
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    // Provider bodies, URLs, tokens, account numbers and raw errors never enter app logs/errors.
    throw new ProviderError();
  }
}
const id = z.string().min(1).max(256);
const money = z
  .union([z.string().regex(/^-?\d+(\.\d+)?$/), z.number()])
  .transform(Number)
  .refine(value => Number.isFinite(value) && Math.abs(value) < 1e12);
const currency = z.string().regex(/^[A-Z]{3}$/);
function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) throw new ProviderError("invalid_data");
  return result.data;
}
function day(value: string) {
  const result = value.slice(0, 10);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(result) ||
    !Number.isFinite(Date.parse(result))
  )
    throw new ProviderError("invalid_data");
  return result;
}

export async function plaidLinkToken(userId: number) {
  const environment = providerEnvironment("plaid");
  const data = parse(
    z.object({ link_token: id, expiration: z.string() }),
    await request("plaid", environment, "/link/token/create", "POST", {
      user: { client_user_id: String(userId) },
      client_name: "UnifyOne",
      products: ["transactions"],
      country_codes: ["US"],
      language: "en",
      ...(process.env.PLAID_REDIRECT_URI
        ? { redirect_uri: process.env.PLAID_REDIRECT_URI }
        : {}),
    })
  );
  return { token: data.link_token, environment };
}
export async function exchangePlaidToken(publicToken: string) {
  const environment = providerEnvironment("plaid");
  const data = parse(
    z.object({ item_id: id, access_token: id }),
    await request("plaid", environment, "/item/public_token/exchange", "POST", {
      public_token: publicToken,
    })
  );
  return { externalId: data.item_id, token: data.access_token, environment };
}
export async function createArgyleUser(userId: number) {
  const environment = providerEnvironment("argyle");
  const data = parse(
    z.object({ id, user_token: z.string().min(1) }),
    await request("argyle", environment, "/v2/users", "POST", {
      external_id: `unifyone:${userId}`,
    })
  );
  return { externalId: data.id, token: data.user_token, environment };
}
export async function argyleUserToken(
  externalId: string,
  environment: ProviderEnvironment
) {
  return parse(
    z.object({ user_token: z.string().min(1) }),
    await request("argyle", environment, "/v2/user-tokens", "POST", {
      user: externalId,
    })
  ).user_token;
}
export async function revokeProvider(
  provider: Provider,
  environment: ProviderEnvironment,
  externalId: string,
  token?: string
) {
  if (provider === "plaid")
    await request(provider, environment, "/item/remove", "POST", {
      access_token: token,
    });
  else
    await request(
      provider,
      environment,
      `/v2/users/${encodeURIComponent(externalId)}`,
      "DELETE"
    );
}
const plaidAccount = z.object({
  account_id: id,
  name: z.string(),
  mask: z.string().nullish(),
  balances: z.object({
    current: z.number().nullable(),
    iso_currency_code: currency.nullish(),
  }),
});
const plaidTransaction = z.object({
  transaction_id: id,
  account_id: id,
  date: z.string(),
  name: z.string(),
  amount: z.number().finite(),
  iso_currency_code: currency,
  pending: z.boolean(),
});
export function normalizePlaidTransaction(value: unknown): Activity {
  const row = parse(plaidTransaction, value);
  return {
    providerRecordId: row.transaction_id,
    sourceAccountId: row.account_id,
    kind: "bank_transaction",
    date: day(row.date),
    description: row.name,
    amount: (-row.amount).toFixed(2),
    currency: row.iso_currency_code,
    pending: row.pending,
    durationSeconds: null,
  };
}
export async function syncPlaid(
  token: string,
  environment: ProviderEnvironment,
  originalCursor: string | null
): Promise<SyncResult> {
  const deadline = Date.now() + 180_000;
  const { accounts } = parse(
    z.object({ accounts: z.array(plaidAccount) }),
    await request(
      "plaid",
      environment,
      "/accounts/get",
      "POST",
      { access_token: token },
      deadline
    )
  );
  for (let attempt = 0; attempt < 3; attempt++) {
    let cursor = originalCursor;
    const records: Activity[] = [];
    const removed: string[] = [];
    try {
      for (let page = 0; page < 100; page++) {
        const data = parse(
          z.object({
            added: z.array(plaidTransaction),
            modified: z.array(plaidTransaction),
            removed: z.array(z.object({ transaction_id: id })),
            next_cursor: z.string(),
            has_more: z.boolean(),
          }),
          await request(
            "plaid",
            environment,
            "/transactions/sync",
            "POST",
            { access_token: token, ...(cursor ? { cursor } : {}), count: 500 },
            deadline
          )
        );
        records.push(
          ...data.added.map(normalizePlaidTransaction),
          ...data.modified.map(normalizePlaidTransaction)
        );
        removed.push(...data.removed.map(row => row.transaction_id));
        cursor = data.next_cursor;
        if (!data.has_more)
          return {
            accounts: accounts.map(account => ({
              id: account.account_id,
              name: account.name,
              mask: account.mask ?? undefined,
              state: "connected",
              balance: account.balances.current,
              currency: account.balances.iso_currency_code ?? null,
            })),
            records,
            removed,
            cursor,
            replace: false,
          };
      }
      throw new ProviderError();
    } catch (error) {
      if (
        !(error instanceof ProviderError) ||
        error.code !== "restart" ||
        attempt === 2
      )
        throw error;
      // Restart the ENTIRE page sequence from the last committed cursor.
    }
  }
  throw new ProviderError();
}

async function argyleList(
  path: string,
  user: string,
  environment: ProviderEnvironment,
  deadline: number
) {
  let next: string | null =
    `/v2/${path}?user=${encodeURIComponent(user)}&limit=200`;
  const records: unknown[] = [];
  const visited = new Set<string>();
  for (let page = 0; page < 100 && next; page++) {
    const url: URL = new URL(next, origins.argyle[environment]);
    if (
      url.origin !== origins.argyle[environment] ||
      url.pathname !== `/v2/${path}` ||
      url.searchParams.get("user") !== user ||
      visited.has(url.href)
    )
      throw new ProviderError("invalid_data");
    visited.add(url.href);
    const data = parse(
      z.object({ results: z.array(z.unknown()), next: z.string().nullable() }),
      await request(
        "argyle",
        environment,
        url.pathname + url.search,
        "GET",
        undefined,
        deadline
      )
    );
    records.push(...data.results);
    next = data.next;
  }
  if (next) throw new ProviderError();
  return records;
}
const argyleAccount = z.object({
  id,
  user: id,
  source: z.string(),
  employers: z.array(z.string()).nullish(),
  connection: z.object({ status: z.string() }),
});
const gig = z.object({
  id,
  account: id,
  employer: z.string().nullish(),
  status: z.string(),
  end_datetime: z.string().nullable(),
  start_datetime: z.string().nullable(),
  duration: z.number().int().nonnegative().nullable(),
  income: z.object({ total: money, currency }),
});
const paystub = z.object({
  id,
  account: id,
  employer: z.string().nullish(),
  status: z.string(),
  paystub_date: z.string(),
  net_pay: money,
  currency,
});
export function normalizeArgyleGig(
  value: unknown,
  accountIds: Set<string>
): Activity | null {
  const row = parse(gig, value);
  if (!accountIds.has(row.account)) throw new ProviderError("invalid_data");
  if (row.status !== "completed") return null;
  const date = row.end_datetime ?? row.start_datetime;
  if (!date) throw new ProviderError("invalid_data");
  return {
    providerRecordId: `gig:${row.id}`,
    sourceAccountId: row.account,
    kind: "gig_earning",
    date: day(date),
    description: row.employer ?? "Gig work",
    amount: row.income.total.toFixed(2),
    currency: row.income.currency,
    pending: false,
    durationSeconds: row.duration,
  };
}
export function normalizeArgylePaystub(
  value: unknown,
  accountIds: Set<string>
): Activity | null {
  const row = parse(paystub, value);
  if (!accountIds.has(row.account)) throw new ProviderError("invalid_data");
  if (row.status !== "completed") return null;
  return {
    providerRecordId: `paystub:${row.id}`,
    sourceAccountId: row.account,
    kind: "income_payment",
    date: day(row.paystub_date),
    description: row.employer ?? "Income payment",
    amount: row.net_pay.toFixed(2),
    currency: row.currency,
    pending: false,
    durationSeconds: null,
  };
}
export async function syncArgyle(
  user: string,
  environment: ProviderEnvironment
): Promise<SyncResult> {
  const deadline = Date.now() + 180_000;
  const accounts = (
    await argyleList("accounts", user, environment, deadline)
  ).map(row => parse(argyleAccount, row));
  if (accounts.some(account => account.user !== user))
    throw new ProviderError("invalid_data");
  const accountIds = new Set(accounts.map(account => account.id));
  const gigs = await argyleList("gigs", user, environment, deadline);
  const paystubs = await argyleList("paystubs", user, environment, deadline);
  const records = [
    ...gigs.map(row => normalizeArgyleGig(row, accountIds)),
    ...paystubs.map(row => normalizeArgylePaystub(row, accountIds)),
  ].filter((row): row is Activity => row !== null);
  return {
    accounts: accounts.map(account => ({
      id: account.id,
      name: account.employers?.join(", ") || account.source,
      state: account.connection.status,
    })),
    records,
    removed: [],
    cursor: null,
    replace: true,
  };
}
