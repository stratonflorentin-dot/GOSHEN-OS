import { describe, expect, it } from "vitest";
import { ACRES_PER_M2, HA_PER_M2, formatAcres, formatCurrency, formatHa } from "./format";

describe("area conversions (§52: area calculations)", () => {
  it("converts 10,000 m2 to exactly 1 hectare", () => {
    expect(10_000 * HA_PER_M2).toBeCloseTo(1, 10);
  });

  it("converts 4,046.8564224 m2 to exactly 1 acre", () => {
    expect(4_046.8564224 * ACRES_PER_M2).toBeCloseTo(1, 10);
  });

  it("formatHa renders hectares with 2 decimals", () => {
    expect(formatHa(24_100)).toBe("2.41 ha");
  });

  it("formatAcres renders acres", () => {
    expect(formatAcres(40_468.564224)).toBe("10 acres");
  });

  it("renders an em dash for unmeasured area instead of zero (§25)", () => {
    expect(formatHa(null)).toBe("—");
    expect(formatAcres(undefined)).toBe("—");
  });
});

describe("formatCurrency", () => {
  it("formats Tanzanian Shillings without decimals", () => {
    expect(formatCurrency(4_800_000, "TZS")).toContain("4,800,000");
  });

  it("handles negative profit", () => {
    expect(formatCurrency(-125_000, "TZS")).toContain("125,000");
  });
});
