export type WebhookFilterSource =
  | "all"
  | "stripe"
  | "shopify"
  | "n8n"
  | "internal";

export type WebhookFilterStatus =
  | "all"
  | "pending"
  | "processed"
  | "failed"
  | "skipped";

export type RevokeTarget = {
  id: number;
  name: string;
};
