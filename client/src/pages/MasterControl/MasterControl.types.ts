export type ProvisioningTemplateKey =
  | "gig-worker-starter"
  | "agency-commerce-pro"
  | "white-label-scale";

export type TenantStatus = "active" | "suspended" | "trial" | "cancelled";

export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "cancelled"
  | "trialing"
  | "none";

export type TenantForm = {
  name: string;
  domain: string;
  logoUrl: string;
  status: TenantStatus;
  subscriptionStatus: SubscriptionStatus;
  planId: string;
  shopifyShopDomain: string;
  shopifySyncEnabled: boolean;
  shopifyCheckoutUrl: string;
  squareLocationId: string;
  n8nWebhookUrl: string;
};

export type ModuleFlag = {
  key: string;
  name: string;
  globalDefault: boolean;
  tenantOverride: string;
  rolloutPercent: number;
  flagMode: "soft" | "hard";
};

export type ChatMessage = {
  role: "Kai" | "Owner";
  content: string;
};
