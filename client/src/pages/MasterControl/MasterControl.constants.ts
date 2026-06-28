import type { ProvisioningTemplateKey } from "./MasterControl.types";

export const PLATFORM_MODULES = [
  "GigIQ",
  "Tax Autopilot",
  "UnifyAI",
  "MoneyPulse",
  "Commerce Engine",
  "Kai",
  "Affiliate Network",
  "Webhooks",
] as const;

export const PROVISIONING_TEMPLATES = [
  {
    name: "Gig Worker Starter",
    plan: "Starter",
    description: "GigIQ, Kai onboarding, tax basics, and one commerce channel.",
  },
  {
    name: "Agency Commerce Pro",
    plan: "Pro",
    description:
      "Multi-client commerce, affiliate ops, MoneyPulse, and analytics.",
  },
  {
    name: "White-Label Scale",
    plan: "Enterprise",
    description:
      "Custom branding, resale controls, governance, and priority credits.",
  },
] as const;

export const TEMPLATE_KEY_BY_NAME: Record<string, ProvisioningTemplateKey> = {
  "Gig Worker Starter": "gig-worker-starter",
  "Agency Commerce Pro": "agency-commerce-pro",
  "White-Label Scale": "white-label-scale",
};
