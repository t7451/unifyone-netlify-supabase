/**
 * Product configuration for 1Commerce Gen AI Research Toolkit
 * Define products, prices, and related metadata here
 */

export const PRODUCTS = {
  GENAI_TOOLKIT: {
    id: "genai_toolkit",
    name: "1Commerce Gen AI Research Toolkit",
    description: "Comprehensive research on Gen AI video startups, funding analysis, and market insights covering 41 companies and $10.1B in tracked funding (2022–2025)",
    price: 2999, // in cents ($29.99)
    currency: "usd",
    stripeProductId: process.env.STRIPE_GENAI_TOOLKIT_PRODUCT_ID || "prod_placeholder",
    stripePriceId: process.env.STRIPE_GENAI_TOOLKIT_PRICE_ID || "price_placeholder",
  },
} as const;

export const TOOLKIT_STORAGE_PATH = "/manus-storage/1Commerce_GenAI_Research_Toolkit_9ec36d75.zip";

export const TOOLKIT_METADATA = {
  companiesTracked: 41,
  totalFunding: "$10.1B",
  fundingPeriod: "2022–2025",
  categories: 8,
  topCompanies: 20,
};
