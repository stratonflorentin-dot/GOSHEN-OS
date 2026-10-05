/**
 * CSV serialization for reports (§38). Escaping follows RFC 4180 so that
 * financial values containing commas, quotes or newlines survive export.
 */

export type ReportCell = string | number | null;

export function csvEscape(value: ReportCell): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export type CsvReportTable = { title: string; columns: string[]; rows: ReportCell[][] };

export type CsvReport = {
  title: string;
  generatedAt: string;
  tables: CsvReportTable[];
};

export function reportToCsv(report: CsvReport): string {
  const lines: string[] = [];
  lines.push(csvEscape(report.title));
  lines.push(csvEscape(`Generated: ${report.generatedAt}`));
  lines.push("");
  for (const table of report.tables) {
    lines.push(csvEscape(table.title));
    lines.push(table.columns.map(csvEscape).join(","));
    for (const row of table.rows) lines.push(row.map(csvEscape).join(","));
    lines.push("");
  }
  return lines.join("\r\n");
}
