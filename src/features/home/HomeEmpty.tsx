import type { Schemas } from "../../api/client";
import { LinkButton, SMALL_CAPS } from "../../components/ui";
import { formatCents } from "../../lib/format";
import { DEFINE_GOAL_PATH } from "./GoalRing";

const DASHED = "rounded-surface border-[1.5px] border-dashed border-line";

/** An account with no confirmed purchase: the final layout as dashed cards, each saying what it unlocks. The ghost figures are not values. */
export function HomeEmpty({ overview }: { overview: Schemas["OverviewOut"] }) {
  const goal = overview.goal_cents;
  return (
    <>
      <section aria-label="Meta pessoal do mês" className={`${DASHED} flex items-center gap-4 p-4.5`}>
        <div aria-hidden className="relative size-37 shrink-0">
          <svg width="148" height="148" viewBox="0 0 148 148" className="size-full -rotate-90">
            <circle cx="74" cy="74" r="62" fill="none" strokeWidth="16" strokeDasharray="3 12" strokeLinecap="round" className="stroke-line" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-extrabold leading-none text-ink-soft">—</span>
            <span className="text-xs text-ink-soft">da meta</span>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className={SMALL_CAPS}>Meta pessoal do mês</p>
          {goal !== null ? (
            <p className="text-sm text-ink-soft">A sua meta pessoal: {formatCents(goal)}. O anel acompanha o gasto assim que houver talões.</p>
          ) : (
            <>
              <p className="text-sm text-ink-soft">Defina a sua meta pessoal, um objetivo seu e não um limite. O anel acompanha por si.</p>
              <LinkButton to={DEFINE_GOAL_PATH} variant="secondary" className="self-start">
                Definir a minha meta pessoal
              </LinkButton>
            </>
          )}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 max-[359px]:grid-cols-1">
        <section aria-label="Média mensal" className={`${DASHED} flex flex-col gap-1.5 p-4`}>
          <p className={SMALL_CAPS}>Média mensal</p>
          <p aria-hidden className="text-3xl font-extrabold leading-tight text-ink-soft">— €</p>
          <p className="text-xs leading-snug text-ink-soft">Aparece com {overview.average_min_months} meses de histórico</p>
          <p className="text-xs font-semibold text-ink-soft">
            {overview.average_months}/{overview.average_min_months} meses
          </p>
        </section>
        <section aria-label="Compras no mês" className={`${DASHED} flex flex-col gap-1.5 p-4`}>
          <p className={SMALL_CAPS}>Compras no mês</p>
          <p aria-hidden className="text-3xl font-extrabold leading-tight text-ink-soft">0</p>
          <p className="text-xs leading-snug text-ink-soft">A aguardar dados</p>
        </section>
      </div>

      <section aria-labelledby="home-first" className="flex flex-col items-center gap-2.5 rounded-surface bg-paper p-5 text-center ring-1 ring-inset ring-line">
        <h2 id="home-first" className="text-xl font-extrabold">
          A aguardar o seu primeiro talão
        </h2>
        <p className="text-sm leading-relaxed text-ink-soft">Quanto mais talões registar, mais aprendemos sobre as suas compras.</p>
        <LinkButton to="/adicionar" className="w-full">
          Adicionar talão
        </LinkButton>
      </section>
    </>
  );
}
