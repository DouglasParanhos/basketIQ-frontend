import type { Schemas } from "../../api/client";
import { SMALL_CAPS } from "../../components/ui";
import { formatCents } from "../../lib/format";

type Overview = Schemas["OverviewOut"];
export type AverageTone = "good" | "neutral" | "high" | "none";

export interface AverageView {
  tone: AverageTone;
  value: string;
  text: string;
  /** «0/2 meses», only while there is no average. */
  progress: string | null;
}

/** The tone and the words come from `average_trend` (the backend applies the ±5 % threshold); the client only shows the absolute value. */
export function averageView(o: Overview): AverageView {
  if (o.monthly_average_cents === null) {
    return { tone: "none", value: "— €", text: `Aparece com ${o.average_min_months} meses de histórico`, progress: `${o.average_months}/${o.average_min_months} meses` };
  }
  const value = formatCents(o.monthly_average_cents);
  if (o.average_trend === null || o.recent_vs_average_pct === null) {
    return { tone: "neutral", value, text: "A tendência aparece com mais um mês completo de compras.", progress: null };
  }
  const size = Math.abs(o.recent_vs_average_pct);
  if (o.average_trend === "below") return { tone: "good", value, text: `Últimos 2 meses: ${size} % abaixo da média`, progress: null };
  if (o.average_trend === "above") return { tone: "high", value, text: `Últimos 2 meses: ${size} % acima da média`, progress: null };
  return { tone: "neutral", value, text: "Últimos 2 meses: na média", progress: null };
}

const SURFACE: Record<AverageTone, string> = {
  good: "bg-ok-soft ring-1 ring-inset ring-ok/20",
  high: "bg-alert-soft ring-1 ring-inset ring-alert/20",
  neutral: "bg-paper ring-1 ring-inset ring-line",
  none: "bg-paper ring-1 ring-inset ring-line",
};

/** The average of the months with purchases and where the last two stand. The same for every month shown. */
export function AverageCard({ overview }: { overview: Overview }) {
  const view = averageView(overview);
  return (
    <section aria-label="Média mensal" className={`flex flex-col gap-1.5 rounded-surface p-4 ${SURFACE[view.tone]}`}>
      <p className={SMALL_CAPS}>Média mensal</p>
      <p className={`amount text-3xl font-extrabold leading-tight ${view.tone === "none" ? "text-ink-soft" : ""}`}>{view.value}</p>
      <p className="text-xs leading-snug">{view.text}</p>
      {view.progress && <p className="text-xs font-semibold text-ink-soft">{view.progress}</p>}
    </section>
  );
}
