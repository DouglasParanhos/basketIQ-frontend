import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthLabel, monthRange, shiftMonth } from "../../lib/month";

const ROUND = "grid size-11 shrink-0 place-items-center rounded-full bg-paper ring-1 ring-inset ring-line disabled:cursor-not-allowed disabled:opacity-40";

/** «Este mês» and its days, with the buttons to the month before and after. The next one is off in the current month. */
export function MonthStepper({ month, current, onChange }: { month: string; current: string; onChange: (month: string) => void }) {
  return (
    <div className="flex items-center justify-between">
      <button type="button" aria-label="Mês anterior" className={ROUND} onClick={() => onChange(shiftMonth(month, -1))}>
        <ChevronLeft aria-hidden className="size-5" />
      </button>
      <div aria-live="polite" className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-soft">{monthLabel(month, current)}</p>
        <p className="font-display text-xl font-semibold">{monthRange(month)}</p>
      </div>
      <button type="button" aria-label="Mês seguinte" className={ROUND} disabled={month >= current} onClick={() => onChange(shiftMonth(month, 1))}>
        <ChevronRight aria-hidden className="size-5" />
      </button>
    </div>
  );
}
