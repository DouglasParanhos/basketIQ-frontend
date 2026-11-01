import type { Schemas } from "../../api/client";
import { formatCents, formatMonth, merchantName } from "../../lib/format";
import { shortMonth } from "../../lib/month";
import { lisbonToday } from "../../lib/period";

type Receipt = Schemas["ReceiptSummaryOut"];
export type MonthTotal = Schemas["MonthTotalOut"];

export type Filter = "todas" | "acao" | "confirmadas";

/** The date a purchase belongs to: the one on the receipt, or the one it was sent while it is still being read. */
const dateOf = (r: Receipt): Date => new Date(r.purchase_at ?? r.created_at);

/** «2026-10»: the month in Lisbon. */
export function monthKey(r: Receipt): string {
  const { y, m0 } = lisbonToday(dateOf(r));
  return `${y}-${String(m0 + 1).padStart(2, "0")}`;
}

export const yearOf = (r: Receipt): number => lisbonToday(dateOf(r)).y;

export interface MonthGroup {
  key: string;
  /** «Outubro 2026». */
  title: string;
  rows: Receipt[];
}

const title = (key: string) => {
  const [first = "", ...rest] = formatMonth(key).replace(" de ", " ");
  return first.toLocaleUpperCase("pt-PT") + rest.join("");
};

/** The API orders by sending; the list is by month of the purchase, newest first. */
export function groupByMonth(items: Receipt[]): MonthGroup[] {
  const sorted = [...items].sort((a, b) => dateOf(b).getTime() - dateOf(a).getTime());
  const groups: MonthGroup[] = [];
  for (const r of sorted) {
    const key = monthKey(r);
    const last = groups.at(-1);
    if (last?.key === key) last.rows.push(r);
    else groups.push({ key, title: title(key), rows: [r] });
  }
  return groups;
}

/** The totals of the month from the endpoint of totals; none where they would mislead («Requer ação» shows what is not confirmed). */
export function monthTotal(group: MonthGroup, totals: MonthTotal[] | undefined, filter: Filter): MonthTotal | undefined {
  return filter === "acao" ? undefined : totals?.find((t) => t.month === group.key);
}

/** «7 confirmados · 248,00 €» from the endpoint of totals; nothing where that would mislead. */
export function headerSummary(group: MonthGroup, totals: MonthTotal[] | undefined, filter: Filter): string | null {
  const total = monthTotal(group, totals, filter);
  if (!total) return null;
  return `${total.confirmed_count} ${total.confirmed_count === 1 ? "confirmado" : "confirmados"} · ${formatCents(total.total_cents)}`;
}

/** The year the list opens on: the one of the purchase sent most recently (the first, the API orders by sending). */
export const defaultYear = (items: Receipt[], currentYear: number): number => (items[0] ? yearOf(items[0]) : currentYear);

/** The years of the selector: the ones with confirmed purchases, the default and the current, newest first. */
export function yearsToShow(totals: MonthTotal[] | undefined, standard: number, currentYear: number): number[] {
  const years = new Set([standard, currentYear, ...(totals ?? []).map((t) => Number(t.month.slice(0, 4)))]);
  return [...years].sort((a, b) => b - a);
}

/** The store of a purchase, or the placeholder while it is still being read. */
export const receiptName = (r: Receipt): string => (r.merchant ? merchantName(r.merchant, r.merchant_name) : "Nota em processamento");

/** «28/10» in Lisbon time, for the receipt paper. */
export function dayMonthSlashOf(r: Receipt): string {
  const { m0, d } = lisbonToday(dateOf(r));
  return `${String(d).padStart(2, "0")}/${String(m0 + 1).padStart(2, "0")}`;
}

/** «28 out.» in Lisbon time, from the date of the purchase (or of sending while it is being read). */
export function dayMonthOf(r: Receipt): string {
  const { m0, d } = lisbonToday(dateOf(r));
  return `${d} ${shortMonth(m0 + 1)}`;
}
