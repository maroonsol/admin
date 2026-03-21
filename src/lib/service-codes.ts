/** Human-readable labels for invoice PDFs and lists */
export const SERVICE_TYPE_LABELS: Record<string, string> = {
  DOMAIN: "Domain",
  VPS: "VPS",
  WEB_HOSTING: "Web Hosting",
  DOMAIN_EMAIL: "Domain Email",
  GST_SERVICES: "GST services",
};

/** Codes stored on Service.serviceCode */
export const SERVICE_CODES_BY_TYPE: Record<string, string> = {
  DOMAIN: "DOM",
  VPS: "VPS",
  WEB_HOSTING: "WEB_HOST",
  DOMAIN_EMAIL: "DOM_EMAIL",
};

export const GST_SERVICE_CODES = [
  { code: "GST_FILING_MON", label: "Monthly GST filing" },
  { code: "GST_FILING_QTR", label: "Quarterly GST filing" },
  { code: "GST_REGISTRATION", label: "GST registration" },
  { code: "GST_AMENDMENT", label: "GST amendment" },
] as const;

export type GstServiceCode = (typeof GST_SERVICE_CODES)[number]["code"];

export function isGstServiceCode(code: string): boolean {
  return GST_SERVICE_CODES.some((g) => g.code === code);
}

export function gstServiceCodeLabel(code: string): string {
  const g = GST_SERVICE_CODES.find((x) => x.code === code);
  return g?.label ?? code;
}

/** Indian FY label for a calendar month (1–12) and year, e.g. Mar 2026 → 2025-26 */
export function getIndianFinancialYearLabel(year: number, month: number): string {
  if (month >= 4) {
    return `${year}-${(year + 1).toString().slice(-2)}`;
  }
  return `${year - 1}-${year.toString().slice(-2)}`;
}

/** Folder segment under FY: two-digit month 01–12 */
export function monthFolderSegment(month: number): string {
  return month.toString().padStart(2, "0");
}

export function quarterFolderSegment(quarter: number): string {
  if (quarter < 1 || quarter > 4) return "Q1";
  return `Q${quarter}`;
}

/**
 * GST return quarter within an Indian FY.
 * fyStartYear = year in which FY begins (1 April), e.g. 2025 for FY 2025-26.
 * Q1 Apr–Jun, Q2 Jul–Sep, Q3 Oct–Dec, Q4 Jan–Mar (calendar fyStartYear+1).
 */
export function fyQuarterToDateRange(
  fyStartYear: number,
  quarter: number
): { start: Date; end: Date } {
  const q = Math.min(4, Math.max(1, quarter));
  if (q === 1) {
    return { start: new Date(fyStartYear, 3, 1), end: new Date(fyStartYear, 5, 30) };
  }
  if (q === 2) {
    return { start: new Date(fyStartYear, 6, 1), end: new Date(fyStartYear, 8, 30) };
  }
  if (q === 3) {
    return { start: new Date(fyStartYear, 9, 1), end: new Date(fyStartYear, 11, 31) };
  }
  return {
    start: new Date(fyStartYear + 1, 0, 1),
    end: new Date(fyStartYear + 1, 2, 31),
  };
}

/** FY folder label e.g. 2025 for FY 2025-26 → "2025-26" */
export function financialYearLabelFromFyStartYear(fyStartYear: number): string {
  return `${fyStartYear}-${(fyStartYear + 1).toString().slice(-2)}`;
}

/** For monthly filing: first/last day of that month */
export function monthToDateRange(year: number, month: number): { start: Date; end: Date } {
  const m = Math.min(12, Math.max(1, month));
  const start = new Date(year, m - 1, 1);
  const end = new Date(year, m, 0);
  return { start, end };
}
