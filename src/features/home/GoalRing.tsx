import type { Schemas } from "../../api/client";
import { Link } from "react-router";
import { SMALL_CAPS } from "../../components/ui";
import { formatCents } from "../../lib/format";
import { ringView, type RingTone } from "./ringView";

/** Where «Definir a minha meta pessoal» goes: the Perfil, already editing the goal (spec 014). */
export const DEFINE_GOAL_PATH = "/definicoes/perfil?editar=meta";

const STROKE: Record<RingTone, string> = { ok: "stroke-ok", warn: "stroke-warn", alert: "stroke-alert", none: "stroke-line" };
const CHIP: Record<RingTone, string> = {
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn-ink",
  alert: "bg-alert-soft text-alert",
  none: "bg-brand-soft text-ink",
};

/** The goal ring and what it says in words: the colour is never the only sign. */
export function GoalRing({ overview, isCurrentMonth }: { overview: Schemas["OverviewOut"]; isCurrentMonth: boolean }) {
  const view = ringView(overview, isCurrentMonth);
  return (
    <section aria-label="Meta pessoal do mês" className="flex flex-col gap-3.5 rounded-surface bg-paper p-4.5 ring-1 ring-inset ring-line">
      <div className="flex items-center gap-4 max-[359px]:flex-col max-[359px]:text-center">
        <div className="relative size-37 shrink-0">
          <svg role="img" aria-label={view.ariaLabel} width="148" height="148" viewBox="0 0 148 148" className="size-full -rotate-90">
            {view.tone !== "none" && <circle cx="74" cy="74" r="62" fill="none" strokeWidth="16" className="stroke-line" />}
            <circle
              cx="74"
              cy="74"
              r="62"
              fill="none"
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={view.dash}
              className={`${STROKE[view.tone]} transition-[stroke-dasharray] duration-500 motion-reduce:transition-none`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-extrabold leading-none ${view.tone === "none" ? "text-ink-soft" : ""}`}>{view.percentText}</span>
            <span className="text-xs text-ink-soft">da meta</span>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <p className={SMALL_CAPS}>Gasto em mercado no mês</p>
          <p className="amount text-3xl font-extrabold leading-tight min-[420px]:text-4xl">{formatCents(overview.spent_cents)}</p>
          {overview.goal_cents !== null ? (
            <p className="text-sm text-ink-soft">
              A sua meta pessoal: {formatCents(overview.goal_cents)}{" "}
              {view.goalNote && <span className="font-semibold text-ink">{view.goalNote}</span>}
            </p>
          ) : (
            <p className="text-sm text-ink-soft">{view.text}</p>
          )}
        </div>
      </div>
      <div className="flex flex-col items-start gap-2 border-t border-line pt-3">
        {view.tone === "none" ? (
          <Link to={DEFINE_GOAL_PATH} className={`inline-flex min-h-11 items-center rounded-full px-3 text-[13px] font-bold ${CHIP.none}`}>
            Definir a minha meta pessoal
          </Link>
        ) : (
          <p className={`rounded-full px-3 py-1.5 text-[13px] font-bold ${CHIP[view.tone]}`}>{view.text}</p>
        )}
        <p className="text-xs leading-snug text-ink-soft">A meta pessoal é um objetivo seu, não um limite. Pode mudá-la quando quiser.</p>
      </div>
    </section>
  );
}
