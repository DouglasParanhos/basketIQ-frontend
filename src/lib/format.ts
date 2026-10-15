const money = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });
const dateFmt = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Lisbon" });
const dateTimeFmt = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Lisbon",
});
const monthFmt = new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric", timeZone: "UTC" });
const pct = new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 1, signDisplay: "always" });

export function formatCents(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "—";
  // Display only: values are stored and computed as integer cents.
  return money.format(cents / 100);
}

/** Amount as printed on a receipt, without the currency sign ("3,49"). */
export function formatAmount(cents: number | null | undefined): string {
  return cents === null || cents === undefined ? "?" : centsToInput(cents);
}

/** Parse "3,49", "3.49", "1.234,56" or "12" into integer cents without floating point. */
export function parseEurToCents(input: string): number | null {
  const raw = input.replace(/[€\s]/g, "");
  if (!raw) return null;
  const match = /^(-)?(\d{1,3}(?:\.\d{3})+|\d+)(?:[,.](\d{1,2}))?$/.exec(raw);
  if (!match) return null;
  const [, sign, whole = "0", frac = ""] = match;
  const cents = Number.parseInt(whole.replace(/\./g, ""), 10) * 100 + Number.parseInt(frac.padEnd(2, "0") || "0", 10);
  return sign ? -cents : cents;
}

export function centsToInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, "0")}`;
}

/** Quantities arrive as decimal strings ("0.513"); shown with a comma. */
export function formatQuantity(quantity: string | null | undefined, unit?: string | null): string {
  if (quantity === null || quantity === undefined) return "?";
  const [i = "0", d = ""] = quantity.split(".");
  const trimmed = d.replace(/0+$/, "");
  const text = trimmed ? `${i},${trimmed}` : i;
  return unit && unit !== "un" ? `${text} ${unit}` : text;
}

export function quantityToInput(quantity: string | null | undefined): string {
  return quantity ? formatQuantity(quantity) : "";
}

export function parseQuantity(input: string): string | null {
  const raw = input.trim().replace(",", ".");
  return /^\d+(\.\d{1,3})?$/.test(raw) && Number(raw) > 0 ? raw : null;
}

export function formatDate(iso: string | null | undefined): string {
  return iso ? dateFmt.format(new Date(iso)) : "—";
}

export function formatDateTime(iso: string | null | undefined): string {
  return iso ? dateTimeFmt.format(new Date(iso)) : "—";
}

export function formatMonth(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return monthFmt.format(new Date(Date.UTC(y ?? 2000, (m ?? 1) - 1, 1)));
}

export function formatVariation(value: number | null | undefined): string | null {
  return value === null || value === undefined ? null : `${pct.format(value)} %`;
}

export const MERCHANT_NAMES: Record<string, string> = {
  CONTINENTE: "Continente",
  PINGO_DOCE: "Pingo Doce",
  LIDL: "Lidl",
  AUCHAN: "Auchan",
  UNKNOWN: "Supermercado desconhecido",
};

export function merchantName(code: string | null | undefined): string {
  return code ? (MERCHANT_NAMES[code] ?? code) : "Supermercado por identificar";
}
