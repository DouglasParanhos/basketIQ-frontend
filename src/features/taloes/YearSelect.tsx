import { ChevronDown } from "lucide-react";
import { useYear } from "./useYear";

/** The year of the list of purchases: a native select, so the keyboard and the screen reader already know it. */
export function YearSelect() {
  const { year, years, setYear } = useYear();
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Ano</span>
      <select
        value={year}
        onChange={(e) => setYear(Number(e.target.value))}
        className="min-h-11 appearance-none rounded-full border-[1.5px] border-line bg-paper pl-4 pr-9 text-sm font-bold text-ink"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-3 size-[18px] text-ink-soft" />
    </label>
  );
}
