import type { ReactNode } from "react";
import type { Schemas } from "../../api/client";
import { LinkButton, SMALL_CAPS } from "../../components/ui";
import { formatCents, NO_AMOUNT } from "../../lib/format";
import { DEFINE_GOAL_PATH } from "./GoalRing";

const DASHED = "rounded-surface border-[1.5px] border-dashed border-line";
const GHOST_FIGURE = "font-display font-semibold leading-[1.1] text-ink-soft";

/** Where «Ver com dados de exemplo» goes: the Início itself, with invented figures (see exampleData.ts). */
export const EXAMPLE_PATH = "/?exemplo=1";

/**
 * An account with no confirmed purchase: the final layout as dashed cards (the month stepper included), covered by a
 * translucent sheet with the way forward. The ghost figures are not values, and the whole ghost is inert: only the
 * sheet and the navigation bar can be reached.
 */
export function HomeEmpty({ overview, people, stepper }: { overview: Schemas["OverviewOut"]; people: number | null; stepper: ReactNode }) {
  const goal = overview.goal_cents;
  return (
    <>
      <div inert className="contents">
        {stepper}
        <section aria-label="Meta pessoal do mês" className={`${DASHED} flex items-center gap-4 p-4.5`}>
          <div aria-hidden className="relative size-37 shrink-0">
            <svg width="148" height="148" viewBox="0 0 148 148" className="size-full -rotate-90">
              <circle cx="74" cy="74" r="62" fill="none" strokeWidth="16" strokeDasharray="3 12" strokeLinecap="round" className="stroke-line" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`${GHOST_FIGURE} text-3xl leading-none`}>—</span>
              <span className="text-xs text-ink-soft">da meta</span>
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className={SMALL_CAPS}>Meta pessoal do mês</p>
            {goal !== null ? (
              <p className="text-sm text-ink-soft">A sua meta pessoal: {formatCents(goal)}. O anel acompanha o gasto assim que houver talões.</p>
            ) : (
              <>
                <p className="text-sm text-ink-soft">Defina a sua meta pessoal, um objetivo seu e não um limite. O anel acompanha o seu progresso.</p>
                <LinkButton to={DEFINE_GOAL_PATH} variant="outline" size="sm" className="self-start">
                  Definir a minha meta pessoal
                </LinkButton>
              </>
            )}
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 max-[359px]:grid-cols-1">
          <section aria-label="Média mensal" className={`${DASHED} flex flex-col gap-1.5 p-4`}>
            <p className={SMALL_CAPS}>Média mensal</p>
            <p aria-hidden className={`${GHOST_FIGURE} text-3xl`}>{NO_AMOUNT}</p>
            <p className="text-xs leading-snug text-ink-soft">Aparece com {overview.average_min_months} meses de histórico</p>
            <p className="text-xs font-semibold text-ink-soft">
              {overview.average_months}/{overview.average_min_months} meses
            </p>
          </section>
          <section aria-label="Compras no mês" className={`${DASHED} flex flex-col gap-1.5 p-4`}>
            <p className={SMALL_CAPS}>Compras no mês</p>
            <p aria-hidden className={`${GHOST_FIGURE} text-3xl`}>0</p>
            <p className="text-xs leading-snug text-ink-soft">A aguardar dados</p>
          </section>
        </div>

        <section aria-label="Por pessoa no mês" className={`${DASHED} flex items-center gap-3 px-4 py-3.5`}>
          <span aria-hidden className="size-10 shrink-0 rounded-xl bg-line" />
          <div className="min-w-0 flex-1">
            <p className={SMALL_CAPS}>Por pessoa no mês</p>
            <p className="text-xs text-ink-soft">{people === null ? "Indique quantas pessoas vivem em casa" : `${people} ${people === 1 ? "pessoa" : "pessoas"} em casa`}</p>
          </div>
          <p aria-hidden className={`${GHOST_FIGURE} text-[1.625rem]`}>{NO_AMOUNT}</p>
        </section>

        <section aria-label="Onde gasta mais" className={`${DASHED} flex flex-col gap-1.5 p-4`}>
          <p className="text-sm font-bold text-ink-soft">Onde gasta mais</p>
          <p className="text-xs text-ink-soft">Aparece com o primeiro talão confirmado</p>
        </section>
      </div>

      {/* Over the content, above the navigation bar (76 px, plus the safe area); beside the rail on a wide screen. */}
      <div className="fixed inset-x-0 top-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-20 grid place-items-center bg-ground/80 p-6 md:absolute md:bottom-0">
        <section aria-labelledby="home-first" className="flex w-full max-w-md flex-col items-center gap-2.5 rounded-[24px] bg-paper px-5 py-[22px] text-center shadow-[0_12px_32px_rgb(20_20_19/0.14)] ring-1 ring-inset ring-line">
          <h2 id="home-first" className="font-display text-[1.375rem] font-semibold">
            A aguardar o seu primeiro talão
          </h2>
          <p className="text-sm leading-[1.45] text-ink-soft">Quanto mais talões registar, mais aprendemos sobre as suas compras.</p>
          <LinkButton to="/adicionar" className="mt-1 min-h-[52px] w-full text-[0.9375rem] font-bold">
            Adicionar o meu primeiro talão
          </LinkButton>
          <LinkButton to={EXAMPLE_PATH} variant="quiet" className="min-h-12 w-full border-[1.5px] border-brand text-sm font-bold">
            Ver com dados de exemplo
          </LinkButton>
        </section>
      </div>
    </>
  );
}
