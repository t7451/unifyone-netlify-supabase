import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  argyleUserToken,
  normalizeArgyleGig,
  normalizeArgylePaystub,
  normalizePlaidTransaction,
  plaidLinkToken,
  syncArgyle,
  syncPlaid,
  revokeProvider,
} from "./providers";
import { openToken, sealToken } from "./crypto";

const transaction = {
  transaction_id: "tx-1",
  account_id: "bank-1",
  date: "2026-10-01",
  name: "Platform payout",
  amount: -100,
  iso_currency_code: "USD",
  pending: false,
};
const gig = {
  id: "gig-1",
  account: "gig-account-1",
  employer: "Delivery app",
  status: "completed",
  end_datetime: "2026-10-01T12:00:00Z",
  start_datetime: "2026-10-01T11:00:00Z",
  duration: 3600,
  income: { total: "38.50", currency: "USD" },
};
const accountResponse = {
  accounts: [
    {
      account_id: "bank-1",
      name: "Checking",
      mask: "1234",
      balances: { current: 500, iso_currency_code: "USD" },
    },
  ],
};
const page = (extra = {}) => ({
  added: [transaction],
  modified: [],
  removed: [],
  next_cursor: "new-cursor",
  has_more: false,
  ...extra,
});
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });

beforeEach(() => {
  vi.stubEnv("PLAID_ENV", "sandbox");
  vi.stubEnv("PLAID_CLIENT_ID", "test-client");
  vi.stubEnv("PLAID_SECRET", "test-secret");
  vi.stubEnv("ARGYLE_ENV", "sandbox");
  vi.stubEnv("ARGYLE_API_KEY", "test-key");
  vi.stubEnv("ARGYLE_API_SECRET", "test-secret");
  vi.stubEnv("FINANCIAL_TOKEN_ENC_KEY", "a".repeat(64));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("read-only link and normalization", () => {
  it("requests only Plaid Transactions and binds Link to the authenticated user", async () => {
    const fetch = vi.fn().mockResolvedValue(
      json({
        link_token: "short-lived-link",
        expiration: "2026-10-01T12:00:00Z",
      })
    );
    vi.stubGlobal("fetch", fetch);
    await plaidLinkToken(42);
    const request = JSON.parse(fetch.mock.calls[0][1].body);
    expect(request.products).toEqual(["transactions"]);
    expect(request.user.client_user_id).toBe("42");
    expect(request).not.toHaveProperty("optional_products");
    expect(fetch.mock.calls[0][1].redirect).toBe("error");
  });
  it("turns bank debits negative and credits positive without labeling a payout as new gig income", () => {
    expect(normalizePlaidTransaction(transaction)).toMatchObject({
      amount: "100.00",
      kind: "bank_transaction",
    });
    expect(
      normalizePlaidTransaction({ ...transaction, amount: 12.34 })
    ).toMatchObject({ amount: "-12.34" });
  });
  it("keeps gig earnings distinct from payroll payment totals and preserves active task time", () => {
    expect(normalizeArgyleGig(gig, new Set([gig.account]))).toMatchObject({
      providerRecordId: "gig:gig-1",
      amount: "38.50",
      kind: "gig_earning",
      durationSeconds: 3600,
    });
    expect(
      normalizeArgylePaystub(
        {
          id: "pay-1",
          account: gig.account,
          employer: "Client",
          status: "completed",
          paystub_date: "2026-10-01T00:00:00Z",
          net_pay: "200",
          currency: "USD",
        },
        new Set([gig.account])
      )
    ).toMatchObject({
      providerRecordId: "paystub:pay-1",
      kind: "income_payment",
      amount: "200.00",
    });
  });
  it("rejects earnings for an account outside the current provider user's accounts", () => {
    expect(() => normalizeArgyleGig(gig, new Set(["someone-else"]))).toThrow();
  });
  it("does not import incomplete gigs or silently substitute USD for missing currency", () => {
    expect(
      normalizeArgyleGig(
        { ...gig, status: "cancelled" },
        new Set([gig.account])
      )
    ).toBeNull();
    expect(() =>
      normalizePlaidTransaction({ ...transaction, iso_currency_code: null })
    ).toThrow();
  });
  it("encrypts tokens with a random nonce and rejects owner substitution or tampering", () => {
    const sealed = sealToken("private-access-token", "42:plaid:sandbox:item");
    expect(sealed).not.toContain("private-access-token");
    expect(sealToken("private-access-token", "42:plaid:sandbox:item")).not.toBe(
      sealed
    );
    expect(openToken(sealed, "42:plaid:sandbox:item")).toBe(
      "private-access-token"
    );
    expect(() => openToken(sealed, "43:plaid:sandbox:item")).toThrow();
    const data = Buffer.from(sealed.slice(3), "base64");
    data[20] ^= 1;
    expect(() =>
      openToken(`v1.${data.toString("base64")}`, "42:plaid:sandbox:item")
    ).toThrow();
  });
});

describe("provider refresh pagination", () => {
  it("fetches every Plaid page, preserves modifications and removals, and returns the final cursor", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(json(accountResponse))
      .mockResolvedValueOnce(
        json(page({ has_more: true, next_cursor: "page-2" }))
      )
      .mockResolvedValueOnce(
        json(
          page({
            added: [],
            modified: [{ ...transaction, amount: -105 }],
            removed: [{ transaction_id: "removed" }],
          })
        )
      );
    vi.stubGlobal("fetch", fetch);
    const result = await syncPlaid("secret-token", "sandbox", "saved-cursor");
    expect(result.records).toHaveLength(2);
    expect(result.removed).toEqual(["removed"]);
    expect(result.cursor).toBe("new-cursor");
    expect(JSON.parse(fetch.mock.calls[1][1].body).cursor).toBe("saved-cursor");
    expect(JSON.parse(fetch.mock.calls[2][1].body).cursor).toBe("page-2");
  });
  it("restarts all pages after a Plaid pagination mutation without retaining discarded changes", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(json(accountResponse))
      .mockResolvedValueOnce(
        json(page({ has_more: true, next_cursor: "discard-me" }))
      )
      .mockResolvedValueOnce(
        json(
          { error_code: "TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION" },
          400
        )
      )
      .mockResolvedValueOnce(
        json(page({ added: [{ ...transaction, transaction_id: "fresh" }] }))
      );
    vi.stubGlobal("fetch", fetch);
    const result = await syncPlaid("secret", "sandbox", "original");
    expect(result.records.map(row => row.providerRecordId)).toEqual(["fresh"]);
    expect(JSON.parse(fetch.mock.calls[3][1].body).cursor).toBe("original");
  });
  it("does not return a partial refresh after a later page fails or expose provider errors", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(json(accountResponse))
      .mockResolvedValueOnce(json(page({ has_more: true })))
      .mockRejectedValueOnce(
        new Error("secret-token and bank-account-details")
      );
    vi.stubGlobal("fetch", fetch);
    await expect(syncPlaid("secret-token", "sandbox", null)).rejects.toThrow(
      "previous data is unchanged"
    );
  });
  it("rejects Argyle pagination that escapes the provider or changes the user", async () => {
    for (const next of [
      "https://attacker.example/v2/accounts?user=owner",
      "https://api-sandbox.argyle.com/v2/accounts?user=other",
    ]) {
      const fetch = vi.fn().mockResolvedValue(json({ results: [], next }));
      vi.stubGlobal("fetch", fetch);
      await expect(syncArgyle("owner", "sandbox")).rejects.toThrow();
      expect(fetch).toHaveBeenCalledTimes(1);
    }
  });
  it("rejects provider accounts belonging to a different user before retrieving their data", async () => {
    const fetch = vi.fn().mockResolvedValue(
      json({
        results: [
          {
            id: "account",
            user: "other-user",
            source: "app",
            employers: [],
            connection: { status: "connected" },
          },
        ],
        next: null,
      })
    );
    vi.stubGlobal("fetch", fetch);
    await expect(syncArgyle("owner", "sandbox")).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("fetches gigs and payments separately with the server-owned Argyle user", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        json({
          results: [
            {
              id: gig.account,
              user: "owner",
              source: "app",
              employers: ["Delivery app"],
              connection: { status: "connected" },
            },
          ],
          next: null,
        })
      )
      .mockResolvedValueOnce(json({ results: [gig], next: null }))
      .mockResolvedValueOnce(json({ results: [], next: null }));
    vi.stubGlobal("fetch", fetch);
    const result = await syncArgyle("owner", "sandbox");
    expect(result.records).toHaveLength(1);
    expect(result.replace).toBe(true);
    expect(
      fetch.mock.calls.every(
        call => new URL(call[0]).searchParams.get("user") === "owner"
      )
    ).toBe(true);
  });
  it("mints a user-scoped Argyle token without returning API credentials", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(json({ user_token: "browser-token" }));
    vi.stubGlobal("fetch", fetch);
    expect(await argyleUserToken("server-owned-user", "sandbox")).toBe(
      "browser-token"
    );
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      user: "server-owned-user",
    });
  });
});

describe("provider recovery and calendar integrity", () => {
  it.each(["INVALID_ACCESS_TOKEN", "ITEM_NOT_FOUND"])(
    "confirms an already removed Plaid item on disconnect retry (%s)",
    async error_code => {
      const fetch = vi.fn().mockResolvedValue(json({ error_code }, 400));
      vi.stubGlobal("fetch", fetch);
      await expect(
        revokeProvider("plaid", "sandbox", "item", "previous-token")
      ).resolves.toBeUndefined();
      expect(new URL(fetch.mock.calls[0][0]).pathname).toBe("/item/remove");
    }
  );
  it("does not treat login-required or a provider outage as confirmed revocation", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(json({ error_code: "ITEM_LOGIN_REQUIRED" }, 400))
      .mockResolvedValueOnce(
        json({ error_code: "INTERNAL_SERVER_ERROR" }, 500)
      );
    vi.stubGlobal("fetch", fetch);
    await expect(
      revokeProvider("plaid", "sandbox", "item", "token")
    ).rejects.toMatchObject({ code: "reconnect" });
    await expect(
      revokeProvider("plaid", "sandbox", "item", "token")
    ).rejects.toMatchObject({ code: "unavailable" });
  });
  it("still rejects an invalid access token while importing rather than declaring an empty successful sync", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(json({ error_code: "INVALID_ACCESS_TOKEN" }, 400))
    );
    await expect(syncPlaid("invalid", "sandbox", null)).rejects.toMatchObject({
      code: "reconnect",
    });
  });
  it.each(["2026-02-29", "2026-02-31", "2026-04-31", "2026-13-01"])(
    "rejects impossible date %s across bank, gig and payroll records",
    date => {
      expect(() =>
        normalizePlaidTransaction({ ...transaction, date })
      ).toThrow();
      expect(() =>
        normalizeArgyleGig(
          { ...gig, end_datetime: date + "T12:00:00Z" },
          new Set([gig.account])
        )
      ).toThrow();
      expect(() =>
        normalizeArgylePaystub(
          {
            id: "p1",
            account: gig.account,
            status: "completed",
            paystub_date: date,
            net_pay: "50",
            currency: "USD",
          },
          new Set([gig.account])
        )
      ).toThrow();
    }
  );
  it("preserves a valid leap day without moving it through the local timezone", () => {
    expect(
      normalizePlaidTransaction({ ...transaction, date: "2024-02-29" }).date
    ).toBe("2024-02-29");
  });
});
