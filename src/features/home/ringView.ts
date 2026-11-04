import type { Schemas } from "../../api/client";
import { formatCents, formatPercent } from "../../lib/format";

type Overview = Schemas["OverviewOut"];

export type RingTone = "ok" | "warn" | "alert" | "none";

export interface RingView {
  tone: RingTone;
  /** The sentence of the chip: the band and the balance, how far above the goal, or that there is no goal. */
  text: string;
  percentText: string;
  /** `stroke-dasharray` of the ring: the filled part and the perimeter (390). */
  dash: string;
  ariaLabel: string;
  /** «Meta atual» when the month shown is not the current one: the API gives today's goal for every month. */
  goalNote: string | null;
}

const PERIMETER = 390;
// Green, gold, gold: red is only for a goal that was passed (below). The API's bands only choose the words.
const BAND: Record<Exclude<Overview["band"], "none">, { tone: RingTone; label: string; colour: string }> = {
  ok: { tone: "ok", label: "Tranquilo", colour: "verde" },
  attention: { tone: "warn", label: "Quase lá", colour: "dourado" },
  high: { tone: "warn", label: "Reta final", colour: "dourado" },
};

/**
 * What the ring shows. The band and the percentage are the API's, never recalculated; the only sum is the balance
 * (goal − spent, whole cents), which also decides «above the goal» (red) because goal_pct rounds.
 */
export function ringView(overview: Overview, isCurrentMonth: boolean): RingView {
  const goalNote = isCurrentMonth ? null : "Meta atual";
  if (overview.band === "none" || overview.goal_cents === null || overview.goal_pct === null) {
    return { tone: "none", text: "Sem meta pessoal definida", percentText: "—", dash: "3 12", ariaLabel: "Anel sem meta definida", goalNote };
  }
  const { tone, label, colour } = BAND[overview.band];
  const balance = overview.goal_cents - overview.spent_cents;
  const above = balance < 0;
  const filled = Math.round((Math.min(overview.goal_pct, 100) / 100) * PERIMETER);
  const goal = `${formatPercent(overview.goal_pct)} da meta${isCurrentMonth ? "" : " atual"}`;
  return {
    tone: above ? "alert" : tone,
    text: above ? `Acima da meta · ${formatCents(-balance)} além da meta` : `${label} · saldo da meta: ${formatCents(balance)}`,
    percentText: formatPercent(overview.goal_pct),
    dash: `${filled} ${PERIMETER}`,
    ariaLabel: above ? `Anel completo e vermelho, meta ultrapassada, ${goal}` : `Anel ${colour}, ${goal} usada`,
    goalNote,
  };
}
