import { formatMonth } from "./format";
import { lisbonToday } from "./period";

/** The month of the Início is `YYYY-MM`, in Lisbon time. */
export function currentMonth(now: Date = new Date()): string {
  const { y, m0 } = lisbonToday(now);
  return `${y}-${String(m0 + 1).padStart(2, "0")}`;
}

/** The month if it is a real `YYYY-MM` (01 to 12), otherwise null. */
export function parseMonth(value: string | null): string | null {
  return value !== null && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : null;
}

export function shiftMonth(month: string, by: -1 | 1): string {
  const [y = 2000, m = 1] = month.split("-").map(Number);
  const index = y * 12 + (m - 1) + by;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** «Este mês» for the current month, otherwise «setembro de 2026». */
export function monthLabel(month: string, current: string): string {
  return month === current ? "Este mês" : formatMonth(month);
}

// Fixed, so the text does not depend on the ICU data of the browser or of Node.
const SHORT = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];

/** «out.» for month 10. */
export const shortMonth = (month: number): string => SHORT[month - 1] ?? "";

/** «27 out.» for «2026-10-27». */
export function formatDayMonth(iso: string): string {
  const [, m = 1, d = 1] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${shortMonth(m)}`;
}

/** «1 – 31 out. 2026». */
export function monthRange(month: string): string {
  const [y = 2000, m = 1] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `1 – ${lastDay} ${SHORT[m - 1]} ${y}`;
}
