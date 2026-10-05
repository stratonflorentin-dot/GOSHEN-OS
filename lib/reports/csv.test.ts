import { describe, expect, it } from "vitest";
import { csvEscape, reportToCsv } from "./csv";

describe("csvEscape", () => {
  it("leaves plain values untouched", () => {
    expect(csvEscape("maize")).toBe("maize");
    expect(csvEscape(1234)).toBe("1234");
    expect(csvEscape(null)).toBe("");
  });

  it("quotes values containing commas", () => {
    expect(csvEscape("1,500 bags")).toBe('"1,500 bags"');
  });

  it("doubles embedded quotes (RFC 4180)", () => {
    expect(csvEscape('say "hello"')).toBe('"say ""hello"""');
  });

  it("quotes values containing newlines so rows stay intact", () => {
    expect(csvEscape("line1\nline2")).toBe('"line1\nline2"');
  });
});

describe("reportToCsv", () => {
  it("emits header metadata, column headers and one row per record", () => {
    const csv = reportToCsv({
      title: "Financial report — Bagamoyo Farm",
      generatedAt: "2026-01-15T09:00:00.000Z",
      tables: [
        {
          title: "Summary",
          columns: ["Metric", "Value"],
          rows: [
            ["Total revenue", 4_800_000],
            ["Net profit", -125_000.5],
            ["Vendor note", 'Acme "Agro" Ltd, TZ'],
          ],
        },
      ],
    });

    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("Financial report — Bagamoyo Farm");
    expect(lines[3]).toBe("Summary");
    expect(lines[4]).toBe("Metric,Value");
    expect(lines[5]).toBe("Total revenue,4800000");
    expect(lines[6]).toBe("Net profit,-125000.5");
    // Comma + quotes in one cell must be quoted and doubled, not split into columns
    expect(lines[7]).toBe('VendorNote,'.replace("VendorNote", "Vendor note") + '"Acme ""Agro"" Ltd, TZ"');
  });

  it("keeps numeric precision for financial totals", () => {
    const csv = reportToCsv({
      title: "t",
      generatedAt: "x",
      tables: [{ title: "t", columns: ["v"], rows: [[0.1 + 0.2]] }],
    });
    expect(csv).toContain((0.1 + 0.2).toString());
  });
});
