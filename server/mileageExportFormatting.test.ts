import { describe, expect, it } from "vitest";
import { formatTaxReportMileageRates } from "../client/src/lib/taxExport";
import { getBusinessMileagePeriods } from "../shared/mileageRates";

describe("export mileage rate descriptions", () => {
  it("keeps half-cent precision instead of rounding a rate to whole cents", () => {
    expect(
      formatTaxReportMileageRates({
        mileageRatePeriods: getBusinessMileagePeriods(2023),
      })
    ).toContain("$0.655/mi");
  });
  it("identifies both 2026 date ranges and their distinct rates", () => {
    const text = formatTaxReportMileageRates({
      mileageRatePeriods: getBusinessMileagePeriods(2026),
    });
    expect(text).toContain("2026-01-01 to 2026-06-30: $0.725/mi");
    expect(text).toContain("2026-07-01 to 2026-12-31: $0.76/mi");
  });
});
