/**
 * UnifyOne — Microsurvey definitions (shared client + server)
 *
 * Voice-of-customer microsurveys that capture the qualitative "WHY" behind the
 * behavioral signal: why a visitor is about to leave (exit-intent) and why a
 * buyer chose to purchase (post-purchase).
 *
 * Responses are stored in `survey_responses`. The survey UI is shown to
 * visitors regardless of analytics-cookie consent (it's a user-facing prompt,
 * not a tracking cookie); the anonymous visitor id is only attached when the
 * visitor has consented.
 */

export const SURVEY_TYPES = ["exit_intent", "post_purchase", "custom"] as const;
export type SurveyType = (typeof SURVEY_TYPES)[number];

export function isSurveyType(value: string): value is SurveyType {
  return (SURVEY_TYPES as readonly string[]).includes(value);
}

export type SurveyDefinition = {
  type: SurveyType;
  question: string;
  /** Quick-pick options; the visitor may also type a free-text answer. */
  options: string[];
};

export const EXIT_INTENT_SURVEY: SurveyDefinition = {
  type: "exit_intent",
  question: "Before you go — what almost stopped you from buying today?",
  options: [
    "Price was too high",
    "Just browsing",
    "Couldn't find what I wanted",
    "Shipping or returns",
    "Need more product info",
  ],
};

export const POST_PURCHASE_SURVEY: SurveyDefinition = {
  type: "post_purchase",
  question: "Thanks for your purchase! What made you decide to buy?",
  options: [
    "Best price",
    "Exactly what I needed",
    "Trusted the brand",
    "Recommendation / review",
    "Fast delivery",
  ],
};

/** Max lengths enforced on both client and server. */
export const SURVEY_LIMITS = {
  question: 300,
  answer: 1000,
} as const;
