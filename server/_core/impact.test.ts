import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../drizzle/schema", () => {
  const mark = (name: string) => {
    const t: any = { __tableName: name };
    for (const c of [
      "id",
      "clickId",
      "imRef",
      "landingUrl",
      "ipHash",
      "userAgent",
      "referer",
      "userId",
      "convertedAt",
      "createdAt",
      "stripeSessionId",
      "amountCents",
      "currency",
      "impactResponse",
      "httpStatus",
      "success",
      "firedAt",
    ]) {
      t[c] = { __col: c, __table: name };
    }
    return t;
  };
  return {
    impactClicks: mark("impact_clicks"),
    impactConversions: mark("impact_conversions"),
  };
});

vi.mock("drizzle-orm", () => ({
  eq: (col: any, val: any) => ({ __op: "eq", col, val }),
  and: (...a: any[]) => ({ __op: "and", args: a }),
  isNull: (col: any) => ({ __op: "isNull", col }),
  desc: (col: any) => ({ __op: "desc", col }),
  gte: (col: any, val: any) => ({ __op: "gte", col, val }),
  sql: () => ({ __sql: true }),
}));

import {
  buildClickCookie,
  clientIpFromRequest,
  fireImpactConversion,
  generateClickId,
  getImpactConfig,
  hashIp,
  IMPACT_COOKIE_NAME,
  readClickCookie,
  recordClick,
} from "./impact";

type Row = Record<string, any>;
const state = {
  clicks: [] as Row[],
  conversions: [] as Row[],
};

function tableName(t: any): string {
  return t?.__tableName ?? "?";
}

function findRows(table: any, filter?: any): Row[] {
  const arr =
    tableName(table) === "impact_clicks" ? state.clicks : state.conversions;
  if (!filter) return arr.slice();
  if (filter.__op === "eq") {
    const colName = filter.col?.__col;
    return arr.filter(r => r[colName!] === filter.val);
  }
  if (filter.__op === "and") {
    return filter.args.reduce((acc: Row[], cond: any) => {
      return acc.filter((r: Row) => {
        if (cond.__op === "eq") return r[cond.col.__col] === cond.val;
        if (cond.__op === "isNull")
          return r[cond.col.__col] === null || r[cond.col.__col] === undefined;
        return true;
      });
    }, arr.slice());
  }
  return arr.slice();
}

function makeDb() {
  const db: any = {
    select: () => {
      const builder: any = {
        _table: null,
        _where: undefined,
        from(t: any) {
          this._table = t;
          return this;
        },
        where(w: any) {
          this._where = w;
          return this;
        },
        orderBy() {
          return this;
        },
        async limit(n: number) {
          return findRows(this._table, this._where).slice(0, n);
        },
        then(resolve: any) {
          return Promise.resolve(findRows(this._table, this._where)).then(
            resolve
          );
        },
      };
      return builder;
    },
    insert(t: any) {
      return {
        values(v: Row) {
          const row = {
            id: state.clicks.length + state.conversions.length + 1,
            ...v,
          };
          if (tableName(t) === "impact_clicks") state.clicks.push(row);
          else state.conversions.push(row);
          return {
            returning: () => Promise.resolve([row]),
            then: (resolve: any) => Promise.resolve([row]).then(resolve),
          };
        },
      };
    },
    update(t: any) {
      return {
        set(vals: Row) {
          return {
            where(w: any) {
              const arr = findRows(t, w);
              for (const row of arr) Object.assign(row, vals);
              return Promise.resolve();
            },
          };
        },
      };
    },
  };
  return db;
}

beforeEach(() => {
  state.clicks.length = 0;
  state.conversions.length = 0;
  delete process.env.IMPACT_ACCOUNT_SID;
  delete process.env.IMPACT_AUTH_TOKEN;
  delete process.env.IMPACT_CAMPAIGN_ID;
  delete process.env.IMPACT_API_BASE_URL;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("impact pure helpers", () => {
  it("generateClickId is 32 hex chars and unique-ish", () => {
    const a = generateClickId();
    const b = generateClickId();
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(a).not.toEqual(b);
  });
  it("hashIp is null-safe and stable", () => {
    expect(hashIp(null)).toBeNull();
    expect(hashIp("")).toBeNull();
    expect(hashIp("1.2.3.4")).toMatch(/^[0-9a-f]{64}$/);
    expect(hashIp("1.2.3.4")).toEqual(hashIp("1.2.3.4"));
    expect(hashIp("1.2.3.4")).not.toEqual(hashIp("1.2.3.5"));
  });
  it("buildClickCookie sets HttpOnly+SameSite+Secure+~90d", () => {
    const c = buildClickCookie("abc");
    expect(c).toContain("im_ref=abc");
    expect(c).toContain("HttpOnly");
    expect(c).toContain("SameSite=Lax");
    expect(c).toContain("Secure");
    const m = c.match(/Max-Age=(\d+)/);
    expect(Number(m![1])).toBeGreaterThanOrEqual(60 * 60 * 24 * 89);
  });
  it("buildClickCookie includes Domain= when supplied", () => {
    expect(buildClickCookie("abc", ".example.com")).toContain(
      "Domain=.example.com"
    );
  });
  it("readClickCookie reads im_ref from a multi-cookie header", () => {
    const r = new Request("https://x/", {
      headers: { cookie: "a=1; im_ref=AFFID_X; b=2" },
    });
    expect(readClickCookie(r)).toEqual("AFFID_X");
  });
  it("readClickCookie returns null when absent", () => {
    const r = new Request("https://x/", { headers: { cookie: "a=1" } });
    expect(readClickCookie(r)).toBeNull();
  });
  it("clientIpFromRequest prefers x-forwarded-for first hop", () => {
    const r = new Request("https://x/", {
      headers: {
        "x-forwarded-for": "9.9.9.9, 10.0.0.1",
        "x-nf-client-connection-ip": "8.8.8.8",
      },
    });
    expect(clientIpFromRequest(r)).toEqual("9.9.9.9");
  });
  it("getImpactConfig requires all three env vars", () => {
    expect(getImpactConfig()).toBeNull();
    process.env.IMPACT_ACCOUNT_SID = "sid";
    process.env.IMPACT_AUTH_TOKEN = "tok";
    expect(getImpactConfig()).toBeNull();
    process.env.IMPACT_CAMPAIGN_ID = "camp";
    expect(getImpactConfig()).toEqual({
      accountSid: "sid",
      authToken: "tok",
      campaignId: "camp",
      apiBaseUrl: "https://api.impact.com",
    });
  });
  it("IMPACT_COOKIE_NAME stays stable", () => {
    expect(IMPACT_COOKIE_NAME).toEqual("im_ref");
  });
});

describe("recordClick", () => {
  it("creates a fresh click row when no existing id supplied", async () => {
    const db = makeDb();
    const r = await recordClick(db, {
      imRef: "PARTNER_X",
      landingUrl: "https://1commerce.online/",
      ipHash: "h",
      userAgent: "ua",
    });
    expect(r.alreadyExisted).toBe(false);
    expect(r.clickId).toMatch(/^[0-9a-f]{32}$/);
    expect(state.clicks).toHaveLength(1);
    expect(state.clicks[0]!.imRef).toBe("PARTNER_X");
  });
  it("reuses existing click_id when row exists", async () => {
    const db = makeDb();
    state.clicks.push({ id: 1, clickId: "EID", imRef: "P" });
    const r = await recordClick(db, { imRef: "P" }, "EID");
    expect(r.alreadyExisted).toBe(true);
    expect(state.clicks).toHaveLength(1);
  });
  it("truncates an over-long im_ref to 200 chars", async () => {
    const db = makeDb();
    await recordClick(db, { imRef: "A".repeat(500) });
    expect((state.clicks[0]!.imRef as string).length).toBe(200);
  });
});

describe("fireImpactConversion", () => {
  it("returns skipped when IMPACT_* env vars missing", async () => {
    const db = makeDb();
    state.clicks.push({ clickId: "C1", imRef: "P", convertedAt: null });
    const r = await fireImpactConversion(db, {
      stripeSessionId: "cs_test_unconfigured",
      amountCents: 9900,
      currency: "USD",
      clickId: "C1",
    });
    expect(r.status).toBe("skipped");
    expect(state.conversions).toHaveLength(0);
  });
  it("returns skipped when no click_id can be resolved", async () => {
    process.env.IMPACT_ACCOUNT_SID = "sid";
    process.env.IMPACT_AUTH_TOKEN = "tok";
    process.env.IMPACT_CAMPAIGN_ID = "camp";
    const db = makeDb();
    const r = await fireImpactConversion(db, {
      stripeSessionId: "cs_test_organic",
      amountCents: 100,
      currency: "USD",
      clickId: null,
      userId: null,
    });
    expect(r.status).toBe("skipped");
  });
  it("is idempotent on stripe_session_id", async () => {
    process.env.IMPACT_ACCOUNT_SID = "sid";
    process.env.IMPACT_AUTH_TOKEN = "tok";
    process.env.IMPACT_CAMPAIGN_ID = "camp";
    const db = makeDb();
    state.clicks.push({ clickId: "C1", imRef: "P", convertedAt: null });
    state.conversions.push({
      clickId: "C1",
      stripeSessionId: "cs_dup",
      amountCents: 100,
      currency: "USD",
      success: true,
    });
    const r = await fireImpactConversion(db, {
      stripeSessionId: "cs_dup",
      amountCents: 100,
      currency: "USD",
      clickId: "C1",
    });
    expect(r.status).toBe("duplicate");
    expect(state.conversions).toHaveLength(1);
  });
  it("dryRun records locally without calling fetch", async () => {
    process.env.IMPACT_ACCOUNT_SID = "sid";
    process.env.IMPACT_AUTH_TOKEN = "tok";
    process.env.IMPACT_CAMPAIGN_ID = "camp";
    const db = makeDb();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const r = await fireImpactConversion(db, {
      stripeSessionId: "cs_dry",
      amountCents: 4900,
      currency: "USD",
      clickId: "C1",
      dryRun: true,
    });
    expect(r.status).toBe("fired");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(state.conversions).toHaveLength(1);
    expect(state.conversions[0]!.success).toBe(true);
  });
  it("fires successfully against a 200 from Impact", async () => {
    process.env.IMPACT_ACCOUNT_SID = "sid";
    process.env.IMPACT_AUTH_TOKEN = "tok";
    process.env.IMPACT_CAMPAIGN_ID = "camp";
    const db = makeDb();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ConversionId: "cv_42" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
    const r = await fireImpactConversion(db, {
      stripeSessionId: "cs_live",
      amountCents: 4900,
      currency: "USD",
      clickId: "C1",
    });
    expect(r.status).toBe("fired");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const init = fetchSpy.mock.calls[0]![1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toEqual(
      `Basic ${Buffer.from("sid:tok").toString("base64")}`
    );
    expect(String(init.body)).toContain("CampaignId=camp");
    expect(String(init.body)).toContain("Amount=49.00");
    expect(state.conversions[0]!.success).toBe(true);
  });
  it("retries on 5xx and surfaces error if all retries fail", async () => {
    process.env.IMPACT_ACCOUNT_SID = "sid";
    process.env.IMPACT_AUTH_TOKEN = "tok";
    process.env.IMPACT_CAMPAIGN_ID = "camp";
    const db = makeDb();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response("upstream", {
          status: 503,
          headers: { "content-type": "text/plain" },
        })
      );
    const r = await fireImpactConversion(db, {
      stripeSessionId: "cs_5xx",
      amountCents: 100,
      currency: "USD",
      clickId: "C1",
    });
    expect(fetchSpy.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(r.status).toBe("error");
    if (r.status === "error") expect(r.httpStatus).toBe(503);
    expect(state.conversions).toHaveLength(1);
    expect(state.conversions[0]!.success).toBe(false);
  });
  it("does NOT retry on 4xx", async () => {
    process.env.IMPACT_ACCOUNT_SID = "sid";
    process.env.IMPACT_AUTH_TOKEN = "tok";
    process.env.IMPACT_CAMPAIGN_ID = "camp";
    const db = makeDb();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response('{"error":"bad"}', {
          status: 401,
          headers: { "content-type": "application/json" },
        })
      );
    const r = await fireImpactConversion(db, {
      stripeSessionId: "cs_4xx",
      amountCents: 100,
      currency: "USD",
      clickId: "C1",
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(r.status).toBe("error");
  });
});
