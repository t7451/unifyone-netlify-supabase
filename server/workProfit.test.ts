import { describe, expect, it } from "vitest";
import {
  calculateWorkProfit,
  DEFAULT_PROFIT_SETTINGS,
} from "../shared/workProfit";

const settings = { costPerMile: 0.4, taxReservePercent: 25, targetHourly: 20 };

describe("work profit planning", () => {
  it("separates actual business costs and the reserve from gross earnings", () => {
    const result = calculateWorkProfit(
      { earnings: 200, hours: 5, miles: 100, otherCosts: 10 },
      settings
    );
    expect(result).toMatchObject({
      vehicleCost: 40,
      expenses: 50,
      operatingProfit: 150,
      taxReserve: 37.5,
      takeHome: 112.5,
      hourly: 22.5,
      earningsGap: 0,
    });
  });

  it("supports freelance work without miles and includes unpaid work in the hourly denominator", () => {
    const result = calculateWorkProfit(
      { earnings: 300, hours: 10, miles: 0, otherCosts: 20 },
      settings
    );
    expect(result.hourly).toBe(21);
    expect(result.vehicleCost).toBe(0);
  });

  it("retains a business loss and never sets aside taxes from a loss", () => {
    expect(
      calculateWorkProfit(
        { earnings: 10, hours: 2, miles: 50, otherCosts: 5 },
        settings
      )
    ).toMatchObject({
      expenses: 25,
      operatingProfit: -15,
      taxReserve: 0,
      takeHome: -15,
      hourly: -7.5,
    });
  });

  it("includes zero-earnings work instead of dropping unpaid shifts", () => {
    expect(
      calculateWorkProfit(
        { earnings: 0, hours: 2, miles: 50, otherCosts: 0 },
        settings
      )
    ).toMatchObject({ takeHome: -20, hourly: -10, taxReserve: 0 });
  });

  it("solves required gross earnings for an after-reserve hourly goal", () => {
    const work = { earnings: 100, hours: 5, miles: 100, otherCosts: 10 };
    const result = calculateWorkProfit(work, settings);
    expect(result.requiredEarnings).toBeCloseTo(183.333333);
    expect(result.earningsGap).toBeCloseTo(83.333333);
    expect(
      calculateWorkProfit(
        { ...work, earnings: result.requiredEarnings! },
        settings
      ).hourly
    ).toBeCloseTo(settings.targetHourly);
  });

  it("does not invent an hourly rate or target without working time", () => {
    expect(
      calculateWorkProfit(
        { earnings: 100, hours: 0, miles: 0, otherCosts: 0 },
        settings
      )
    ).toMatchObject({
      hourly: null,
      requiredEarnings: null,
      earningsGap: null,
    });
  });

  it("calculates the total reserve after combining profit and loss, rather than taxing every income row", () => {
    const profitable = calculateWorkProfit(
      { earnings: 100, hours: 4, miles: 0, otherCosts: 0 },
      settings
    );
    const loss = calculateWorkProfit(
      { earnings: 10, hours: 1, miles: 0, otherCosts: 30 },
      settings
    );
    const combined = calculateWorkProfit(
      { earnings: 110, hours: 5, miles: 0, otherCosts: 30 },
      settings
    );
    expect(combined.taxReserve).toBe(20);
    expect(combined.taxReserve).toBeLessThan(
      profitable.taxReserve + loss.taxReserve
    );
  });

  it("permits a zero reserve and a zero hourly goal", () => {
    expect(
      calculateWorkProfit(
        { earnings: 40, hours: 2, miles: 0, otherCosts: 10 },
        { ...settings, taxReservePercent: 0, targetHourly: 0 }
      )
    ).toMatchObject({
      takeHome: 30,
      hourly: 15,
      requiredEarnings: 10,
      earningsGap: 0,
    });
  });

  it.each([NaN, Infinity, -1, 100, 101])(
    "rejects an invalid reserve of %s",
    taxReservePercent => {
      expect(() =>
        calculateWorkProfit(
          { earnings: 1, hours: 1, miles: 0, otherCosts: 0 },
          { ...settings, taxReservePercent }
        )
      ).toThrow(RangeError);
    }
  );

  it.each([NaN, Infinity, -1])(
    "rejects invalid cost/earnings inputs of %s",
    value => {
      expect(() =>
        calculateWorkProfit(
          { earnings: value, hours: 1, miles: 0, otherCosts: 0 },
          settings
        )
      ).toThrow(RangeError);
      expect(() =>
        calculateWorkProfit(
          { earnings: 100, hours: 1, miles: 0, otherCosts: 0 },
          { ...settings, costPerMile: value }
        )
      ).toThrow(RangeError);
    }
  );

  it("rejects overflow rather than displaying an infinite profit or hourly goal", () => {
    expect(() =>
      calculateWorkProfit(
        { earnings: 0, hours: Number.MAX_VALUE, miles: 0, otherCosts: 0 },
        settings
      )
    ).toThrow(RangeError);
  });

  it("makes starting assumptions explicit and leaves callers' inputs unchanged", () => {
    const work = Object.freeze({
      earnings: 50,
      hours: 2,
      miles: 10,
      otherCosts: 0,
    });
    const copy = { ...DEFAULT_PROFIT_SETTINGS };
    calculateWorkProfit(work, DEFAULT_PROFIT_SETTINGS);
    expect(DEFAULT_PROFIT_SETTINGS).toEqual(copy);
  });
  it("uses only the documented fields when callers attach source metadata", () => {
    const tagged = {
      earnings: 200,
      hours: 5,
      miles: 100,
      otherCosts: 10,
      source: "Delivery",
    };
    const taggedSettings = { ...settings, description: "My assumptions" };
    expect(calculateWorkProfit(tagged, taggedSettings).hourly).toBe(22.5);
  });
});
