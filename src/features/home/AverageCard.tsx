import type { Schemas } from "../../api/client";
import { SMALL_CAPS } from "../../components/ui";
import { formatCents } from "../../lib/format";

type Overview = Schemas["OverviewOut"];
export interface AverageView {
  /** No average yet: the figure is muted. The card is the same neutral card either way, never green or red. */
  empty: boolean;
  value: string;
  text: string;
  /** «0/2 meses», only while there is no average. */
  progress: string | null;
}

/** The tone and the words come from `average_trend` (the backend applies the ±5 % threshold); the client only shows the absolute value. */
export function averageView(o: Overview): AverageView {
  if (o.monthly_average_cents === null) {
    return { empty: true, value: "— €", text: `Aparece com ${o.average_min_months} meses de histórico`, progress: `${o.average_months}/${o.average_min_months} meses` };
  }
  const value = formatCents(o.monthly_average_cents);
  if (o.average_trend === null || o.recent_vs_average_pct === null) {
    return { empty: false, value, text: "A tendência aparece com mais um mês completo de compras.", progress: null };
  }
  const size = Math.abs(o.recent_vs_average_pct);
  if (o.average_trend === "below") return { empty: false, value, text: `Últimos 2 meses: ${size} % abaixo da média`, progress: null };
  if (o.average_trend === "above") return { empty: false, value, text: `Últimos 2 meses: ${size} % acima da média`, progress: null };
  return { empty: false, value, text: "Últimos 2 meses: na média", progress: null };
}

/** The average of the months with purchases and where the last two stand. The same for every month shown. */
export function AverageCard({ overview }: { overview: Overview }) {
  const view = averageView(overview);
  return (
    <section aria-label="Média mensal" className="flex flex-col gap-1.5 rounded-surface bg-paper p-4 ring-1 ring-inset ring-line">
      <p className={SMALL_CAPS}>Média mensal</p>
      <p className={`amount font-display text-3xl font-semibold leading-[1.1] ${view.empty ? "text-ink-soft" : ""}`}>{view.value}</p>
      <p className="text-xs leading-snug text-ink-soft">{view.text}</p>
      {view.progress && <p className="text-xs font-semibold text-ink-soft">{view.progress}</p>}
    </section>
  );
}
