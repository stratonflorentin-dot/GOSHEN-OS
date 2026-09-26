import { describe, expect, it } from "vitest";
import { haversineM, pathLengthM, polygonAreaM2 } from "./geo";

describe("geospatial calculations", () => {
  it("returns zero distance for identical coordinates", () => {
    expect(haversineM([-6.8, 39.2], [-6.8, 39.2])).toBe(0);
  });

  it("measures a one degree equatorial segment within expected tolerance", () => {
    expect(haversineM([0, 0], [0, 1])).toBeGreaterThan(111_000);
    expect(haversineM([0, 0], [0, 1])).toBeLessThan(112_000);
  });

  it("sums consecutive GPS path segments", () => {
    expect(pathLengthM([[0, 0], [0, 1], [0, 2]])).toBeCloseTo(2 * haversineM([0, 0], [0, 1]));
  });

  it("calculates a positive area and rejects undersized rings", () => {
    expect(polygonAreaM2([[0, 0], [0, 0.001], [0.001, 0.001], [0.001, 0]])).toBeGreaterThan(10_000);
    expect(polygonAreaM2([[0, 0], [0, 1]])).toBe(0);
  });
});
