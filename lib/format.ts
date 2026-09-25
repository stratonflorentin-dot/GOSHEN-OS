export const HA_PER_M2 = 1 / 10_000;
export const ACRES_PER_M2 = 1 / 4_046.8564224;

export function formatHa(m2: number | null | undefined, locale = "en"): string {
  if (m2 == null) return "—";
  return `${(m2 * HA_PER_M2).toLocaleString(locale, { maximumFractionDigits: 2 })} ha`;
}

export function formatAcres(m2: number | null | undefined, locale = "en"): string {
  if (m2 == null) return "—";
  return `${(m2 * ACRES_PER_M2).toLocaleString(locale, { maximumFractionDigits: 2 })} acres`;
}

export function formatAreaTriple(m2: number | null | undefined, locale = "en"): string {
  if (m2 == null) return "—";
  return `${formatHa(m2, locale)} / ${formatAcres(m2, locale)} / ${Math.round(m2).toLocaleString(locale)} m²`;
}
  
export function formatCurrency(amount: number, currency = "TZS", locale = "en"): string {  
  return new Intl.NumberFormat(locale, {  
    style: "currency",  
    currency,  
    minimumFractionDigits: 0,  
    maximumFractionDigits: 0,  
  }).format(amount);  
} 
