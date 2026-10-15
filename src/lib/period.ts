export type PeriodKind = "month" | "quarter" | "year" | "custom";

export interface Period {
  kind: PeriodKind;
  from: string; // YYYY-MM-DD, inclusive
  to: string;
}

function iso(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function lastDay(year: number, month0: number): Date {
  return new Date(Date.UTC(year, month0 + 1, 0));
}

/** "Today" in Lisbon, as Y/M/D numbers. */
export function lisbonToday(now: Date = new Date()): { y: number; m0: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(now)
    .split("-")
    .map(Number);
  return { y: parts[0] ?? 2000, m0: (parts[1] ?? 1) - 1, d: parts[2] ?? 1 };
}

export function periodFor(kind: Exclude<PeriodKind, "custom">, anchor: { y: number; m0: number }): Period {
  if (kind === "month") {
    return { kind, from: iso(new Date(Date.UTC(anchor.y, anchor.m0, 1))), to: iso(lastDay(anchor.y, anchor.m0)) };
  }
  if (kind === "quarter") {
    const q0 = Math.floor(anchor.m0 / 3) * 3;
    return { kind, from: iso(new Date(Date.UTC(anchor.y, q0, 1))), to: iso(lastDay(anchor.y, q0 + 2)) };
  }
  return { kind, from: `${anchor.y}-01-01`, to: `${anchor.y}-12-31` };
}

export function shiftPeriod(period: Period, step: -1 | 1): Period {
  const [y = 2000, m = 1] = period.from.split("-").map(Number);
  if (period.kind === "month" || period.kind === "quarter") {
    const m0 = m - 1 + step * (period.kind === "month" ? 1 : 3);
    return periodFor(period.kind, { y: y + Math.floor(m0 / 12), m0: ((m0 % 12) + 12) % 12 });
  }
  if (period.kind === "year") return periodFor("year", { y: y + step, m0: 0 });
  return period;
}

const monthLabel = new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric", timeZone: "UTC" });
const dayLabel = new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function describePeriod(period: Period): string {
  const [y = 2000, m = 1] = period.from.split("-").map(Number);
  if (period.kind === "month") return monthLabel.format(new Date(Date.UTC(y, m - 1, 1)));
  if (period.kind === "quarter") return `${Math.floor((m - 1) / 3) + 1}.º trimestre de ${y}`;
  if (period.kind === "year") return String(y);
  const from = new Date(`${period.from}T00:00:00Z`);
  const to = new Date(`${period.to}T00:00:00Z`);
  return `${dayLabel.format(from)} – ${dayLabel.format(to)}`;
}
