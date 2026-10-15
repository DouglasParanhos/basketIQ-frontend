import { ChevronLeft, ChevronRight } from "lucide-react";
import { describePeriod, lisbonToday, periodFor, shiftPeriod, type Period, type PeriodKind } from "../../lib/period";

const KINDS: { kind: PeriodKind; label: string }[] = [
  { kind: "month", label: "Mês" },
  { kind: "quarter", label: "Trimestre" },
  { kind: "year", label: "Ano" },
  { kind: "custom", label: "Intervalo" },
];

export function PeriodPicker({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const today = lisbonToday();
  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-label="Período" className="grid grid-cols-4 gap-1 rounded-full bg-paper p-1 ring-1 ring-inset ring-line">
        {KINDS.map(({ kind, label }) => (
          <button
            key={kind}
            role="radio"
            aria-checked={value.kind === kind}
            onClick={() =>
              onChange(
                kind === "custom"
                  ? { kind, from: value.from, to: value.to }
                  : periodFor(kind, { y: Number(value.from.slice(0, 4)) || today.y, m0: Number(value.from.slice(5, 7)) - 1 || today.m0 }),
              )
            }
            className="min-h-10 rounded-full text-sm font-semibold text-ink-soft aria-checked:bg-cobalt aria-checked:text-white dark:aria-checked:text-ground"
          >
            {label}
          </button>
        ))}
      </div>
      {value.kind === "custom" ? (
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            De
            <input
              type="date"
              value={value.from}
              max={value.to}
              onChange={(e) => e.target.value && onChange({ ...value, from: e.target.value })}
              className="min-h-11 rounded-control border border-line bg-paper px-3 text-ink"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            Até
            <input
              type="date"
              value={value.to}
              min={value.from}
              onChange={(e) => e.target.value && onChange({ ...value, to: e.target.value })}
              className="min-h-11 rounded-control border border-line bg-paper px-3 text-ink"
            />
          </label>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <button onClick={() => onChange(shiftPeriod(value, -1))} aria-label="Período anterior" className="grid size-11 place-items-center rounded-full hover:bg-cobalt-soft">
            <ChevronLeft aria-hidden className="size-5" />
          </button>
          <p className="text-lg font-bold first-letter:uppercase" aria-live="polite">
            {describePeriod(value)}
          </p>
          <button onClick={() => onChange(shiftPeriod(value, 1))} aria-label="Período seguinte" className="grid size-11 place-items-center rounded-full hover:bg-cobalt-soft">
            <ChevronRight aria-hidden className="size-5" />
          </button>
        </div>
      )}
    </div>
  );
}
