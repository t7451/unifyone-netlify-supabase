import {
  getSurveyResults,
  insertSurveyResponse,
  type SurveyResponseInput,
} from "../../db";

/**
 * Data-access layer for the surveys router. Wraps the shared `../../db` survey
 * helpers; behavior is identical to the original router.
 */

export async function insertResponse(
  tenantId: number,
  response: SurveyResponseInput
) {
  await insertSurveyResponse(tenantId, response);
}

export async function getResults(tenantId: number, days: number) {
  return getSurveyResults(tenantId, days);
}
