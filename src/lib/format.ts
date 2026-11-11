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

export function formatCents(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "—";
  // Display only: values are stored and computed as integer cents.
  return money.format(cents / 100);
}

/** The space between a figure and «%» or «€» is the non-breaking one that Intl puts before «€», so a line never breaks between them. */
export const NBSP = "\u00A0";

/** The figure of an amount that is not known yet ("— €"). */
export const NO_AMOUNT = `—${NBSP}€`;

const percent = new Intl.NumberFormat("pt-PT");

/** A percentage in the Portuguese convention: "38 %". */
export function formatPercent(value: number): string {
  return `${percent.format(value)}${NBSP}%`;
}

const UNIT_BASE: Record<string, string> = { kg: "/kg", l: "/l", un: "/un." };

/** A price in its base unit ("1,59 € /un."); "—" when there is none, so no base is shown without a price. */
export function formatUnitPrice(cents: number | null | undefined, basis: string): string {
  return cents === null || cents === undefined ? "—" : `${formatCents(cents)} ${UNIT_BASE[basis] ?? ""}`.trim();
}

const wholeEuros = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

/** A whole number of euros for display only ("300 €"); the value itself is multiplied into integer cents before it is sent. */
export function formatWholeEuros(euros: number): string {
  return wholeEuros.format(euros);
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
/** «1 compra», «2 compras»: the figure in the Portuguese convention and the word in the right number (T-47). */
export const plural = (n: number | string, one: string, many: string) => `${formatQuantity(String(n))} ${Number(n) === 1 ? one : many}`;

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

/** «2 compras a mais», «1 compra a menos» or «o mesmo número de compras» against the period before: the count behind a change of spending. */
export function formatPurchasesAgainst(current: number, previous: number): string {
  const diff = current - previous;
  if (diff === 0) return "o mesmo número de compras";
  return `${plural(Math.abs(diff), "compra", "compras")} ${diff > 0 ? "a mais" : "a menos"}`;
}

/** «23 % abaixo de setembro»: the direction is in words, never only a sign. Null when there is nothing to compare. */
export function formatVariationAgainst(value: number | null | undefined, label: string): string | null {
  if (value === null || value === undefined) return null;
  const size = Math.round(Math.abs(value) * 10) / 10;
  if (size === 0) return `igual a ${label}`;
  return `${formatPercent(size)} ${value > 0 ? "acima" : "abaixo"} de ${label}`;
}
