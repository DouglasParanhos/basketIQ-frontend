import { useSearchParams } from "react-router";
import { defaultYear, yearsToShow } from "../receipts/months";
import { useLatestReceipt } from "../receipts/useLatestReceipt";
import { lisbonToday } from "../../lib/period";
import { useMonths } from "./useMonths";

/** `?ano=2025`: a year from 2000 to 2099, otherwise ignored. */
export const parseYear = (value: string | null): number | null => (value !== null && /^20\d\d$/.test(value) ? Number(value) : null);

/**
 * The year shown in Compras. By default the year of the purchase sent most recently (so a new purchase is never
 * hidden behind an older year); the others come from `?ano=`. Choosing the default takes the parameter out.
 */
export function useYear() {
  const [params, setParams] = useSearchParams();
  const latest = useLatestReceipt();
  const months = useMonths();
  const current = lisbonToday().y;
  const standard = defaultYear(latest.data?.items ?? [], current);
  const year = parseYear(params.get("ano")) ?? standard;
  const years = yearsToShow(months.data, standard, current);
  const setYear = (next: number) => {
    const rest = new URLSearchParams(params);
    if (next === standard) rest.delete("ano");
    else rest.set("ano", String(next));
    setParams(rest, { replace: true });
  };
  return { year, years: years.includes(year) ? years : [year, ...years].sort((a, b) => b - a), setYear };
}
