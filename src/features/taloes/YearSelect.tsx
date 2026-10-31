import { useYear } from "./useYear";

/** The year of the list of purchases: a native select, so the keyboard and the screen reader already know it. */
export function YearSelect() {
  const { year, years, setYear } = useYear();
  return (
    <label className="inline-flex">
      <span className="sr-only">Ano</span>
      <select
        value={year}
        onChange={(e) => setYear(Number(e.target.value))}
        className="min-h-11 rounded-full border border-line bg-paper px-4 text-sm font-bold text-ink"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </label>
  );
}
