import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = {
  selectResults: [] as Array<Array<{ total: number }>>,
};

const mockFrom = vi.fn(
  () => Promise.resolve(mockState.selectResults.shift() ?? [{ total: 0 }])
);
const mockSelect = vi.fn(() => ({ from: mockFrom }));

vi.mock("./db", () => ({
  getDb: vi.fn(() =>
    Promise.resolve({
      select: mockSelect,
    })
  ),
}));

import { systemRouter } from "./_core/systemRouter";

describe("systemRouter.launchStats", () => {
  beforeEach(() => {
    mockState.selectResults = [];
    mockFrom.mockClear();
    mockSelect.mockClear();
  });

  it("returns aggregate tenant and order counts with the supported integration total", async () => {
    mockState.selectResults = [[{ total: 12 }], [{ total: 48 }]];

    const caller = systemRouter.createCaller(
      {} as Parameters<typeof systemRouter.createCaller>[0]
    );

    await expect(caller.launchStats()).resolves.toEqual({
      tenants: 12,
      ordersProcessed: 48,
      integrations: 10,
    });
  });
});
