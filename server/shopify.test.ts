import { beforeEach, describe, expect, it, vi } from "vitest";
import { shopifySyncLog, webhookEvents } from "../drizzle/schema";

const mockValues = vi.fn(() => Promise.resolve());
const mockInsert = vi.fn(() => ({ values: mockValues }));
const mockDb = {
  insert: mockInsert,
};

vi.mock("./db", () => ({
  getDb: vi.fn(() => Promise.resolve(mockDb)),
}));

import { logSyncEvent } from "./shopify";

describe("logSyncEvent", () => {
  beforeEach(() => {
    mockInsert.mockClear();
    mockValues.mockClear();
  });

  it("mirrors Shopify deliveries into webhook_events and shopify_sync_log", async () => {
    await logSyncEvent({
      storeId: 12,
      tenantId: 34,
      event: "orders/create",
      entity: "order",
      entityId: "gid://shopify/Order/1",
      direction: "inbound",
      status: "failed",
      errorMsg: "Invalid Shopify webhook signature",
      retryCount: 2,
      payload: { id: 1, topic: "orders/create" },
      headers: { "x-shopify-topic": "orders/create" },
      rawBody: '{"id":1}',
      shopDomain: "demo.myshopify.com",
      receivedAt: "2026-04-22T00:00:00.000Z",
    });

    expect(mockInsert).toHaveBeenNthCalledWith(1, webhookEvents);
    expect(mockInsert).toHaveBeenNthCalledWith(2, shopifySyncLog);

    expect(mockValues).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        tenantId: 34,
        source: "shopify",
        eventType: "orders/create",
        status: "failed",
        error: "Invalid Shopify webhook signature",
        payload: expect.objectContaining({
          shopDomain: "demo.myshopify.com",
          storeId: 12,
          rawBody: '{"id":1}',
        }),
      })
    );

    expect(mockValues).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        storeId: 12,
        tenantId: 34,
        event: "orders/create",
        status: "failed",
      })
    );
  });
});
