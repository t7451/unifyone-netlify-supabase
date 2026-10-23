import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
vi.mock("../../db", () => ({ getDb: vi.fn() }));
import { getDb } from "../../db";
import { escapeLike, historyQuery, load } from "./repo";
const input = {
  from: "2026-10-01T07:00:00Z",
  before: "2026-11-01T07:00:00Z",
  limit: 25,
  offset: 0,
};
const compile = (changes = {}) =>
  new PgDialect().sqlToQuery(historyQuery(42, { ...input, ...changes }));
beforeEach(() => vi.resetAllMocks());
describe("snapshot history SQL", () => {
  it("requires both row and batch owners with completed/committed status", () => {
    const { sql, params } = compile();
    expect(sql).toContain('from gig_shifts where "userId" =');
    expect(sql).toContain("status = 'completed'");
    expect(sql).toContain("\"entrySource\" in ('manual', 'timer')");
    expect(sql).toContain('where e."userId" =');
    expect(sql).toContain('and b."userId" =');
    expect(sql).toContain("b.status = 'committed'");
    expect(params.filter(value => value === 42)).toHaveLength(3);
    expect(sql).not.toMatch(
      /financial_activity|financial_connections|rawRow|notes|durationHours/i
    );
  });
  it("uses inclusive start and exclusive end instants converted explicitly to UTC", () => {
    const { sql, params } = compile();
    expect(sql).toMatch(/started >= .*timestamptz at time zone 'UTC'/);
    expect(sql).toMatch(/started < .*timestamptz at time zone 'UTC'/);
    expect(params).toContain(input.from);
    expect(params).toContain(input.before);
    expect(sql).toContain('e."earnedDate"');
  });
  it("parameterizes exact source and literal search with escaped wildcard characters", () => {
    const { sql, params } = compile({
      source: "client' OR true --",
      query: "50%_\\",
    });
    expect(sql).not.toContain("client' OR true");
    expect(params).toContain("client' OR true --");
    expect(params).toContain("%50\\%\\_\\\\%");
    expect(params).toContain("\\");
    expect(escapeLike("_%\\")).toBe("\\_\\%\\\\");
  });
  it("filters import statement dates separately from local session instants", () => {
    const { sql, params } = compile({
      fromDate: "2026-10-01",
      beforeDate: "2026-10-02",
    });
    expect(sql).toContain("kind = 'import' and started >=");
    expect(sql).toContain("kind <> 'import' and started >=");
    expect(params).toContain("2026-10-01");
    expect(params).toContain("2026-10-02");
    expect(params).toContain(input.from);
    expect(params).toContain(input.before);
  });
  it("orders union ties stably and paginates before JSON aggregation, not before totals", () => {
    const { sql, params } = compile({ limit: 12, offset: 24 });
    expect(sql).toContain("union all");
    expect(sql).toMatch(
      /order by started desc, kind asc, id desc limit \$\d+ offset \$\d+/
    );
    expect(params.slice(-2)).toEqual([12, 24]);
    expect(sql).toContain("sum(base + tips + bonuses)");
    expect(sql).toContain("from filtered");
    expect(sql).toContain("select distinct source from owned");
    expect(sql).toContain("null::numeric");
    expect(sql).not.toMatch(/avg\(/i);
  });
  it("returns a missing database error and does not convert it to empty rows", async () => {
    vi.mocked(getDb).mockResolvedValue(null);
    await expect(load(42, input)).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
  });
  it("executes a single statement and returns its snapshot", async () => {
    const execute = vi.fn().mockResolvedValue({ rows: [{ entries: [] }] });
    vi.mocked(getDb).mockResolvedValue({ execute } as never);
    await expect(load(42, input)).resolves.toEqual({ entries: [] });
    expect(execute).toHaveBeenCalledOnce();
  });
});
