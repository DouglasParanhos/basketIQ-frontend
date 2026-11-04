import { Minus, Plus } from "lucide-react";
import type { Dispatch } from "react";
import { ChoiceCard, Tick } from "../../components/Choice";
import { MarketTile } from "../../components/MarketBadge";
import { Button, Notice, Spinner } from "../../components/ui";
import { formatWholeEuros, NO_AMOUNT } from "../../lib/format";
import { GOAL_OPTIONS } from "../profile/goals";
import { useMerchants } from "../profile/useProfile";
import {
  GOAL_MAX_EUROS,
  GOAL_MIN_EUROS,
  GOAL_STEP_EUROS,
  PEOPLE_MAX,
  PEOPLE_MIN,
  isAllGoals,
  type Action,
  type OnboardingState,
} from "./state";

/** Title and help line of each step, by step index, and what «Avançar» says while the step has no answer. */
export const STEP_COPY = [
  { title: "Qual é o seu objetivo com a aplicação?", hint: "Escolha quantos quiser.", blocked: "Escolha uma opção para avançar, ou salte este passo." },
  { title: "Quantas pessoas vivem em sua casa?", hint: "Pode alterar este número mais tarde, no Perfil.", blocked: "Indique quantas pessoas, ou salte este passo." },
  { title: "Onde costuma fazer compras?", hint: "Escolha todos os mercados que usa.", blocked: "Escolha um mercado para avançar, ou salte este passo." },
  { title: "Qual é a sua meta pessoal por mês?", hint: "Por mês. Pode mudá-la quando quiser.", blocked: "Defina um valor ou toque em «Ainda não sei»." },
] as const;

export function GoalsStep({ state, dispatch }: { state: OnboardingState; dispatch: Dispatch<Action> }) {
  const rows: { key: string; title: string; hint: string; checked: boolean; action: Action }[] = [
    ...GOAL_OPTIONS.map(({ goal, title, hint }) => ({ key: goal, title, hint, checked: state.goals.includes(goal), action: { type: "toggleGoal", goal } as Action })),
    { key: "all", title: "Todas as anteriores", hint: "Quero tudo isso", checked: isAllGoals(state.goals), action: { type: "toggleAllGoals" } },
  ];
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map(({ key, title, hint, checked, action }) => (
        <ChoiceCard key={key} checked={checked} onChange={() => dispatch(action)} className="min-h-[4.5rem] items-center gap-3 px-4 py-3">
          <span className="flex-1">
            <span className="block font-bold">{title}</span>
            <span className="block text-[0.8125rem] text-ink-soft">{hint}</span>
          </span>
          <Tick checked={checked} />
        </ChoiceCard>
      ))}
    </div>
  );
}

export function PeopleStep({ state, dispatch }: { state: OnboardingState; dispatch: Dispatch<Action> }) {
  const round = "grid size-16 place-items-center rounded-full disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="mt-[3.75rem] flex flex-col items-center text-center">
      <output aria-live="polite" className="flex flex-col items-center gap-2">
        <span className="font-display text-[clamp(4.5rem,30vw,7.5rem)] font-semibold leading-none">{state.householdSize ?? "—"}</span>{" "}
        <span className="text-base text-ink-soft">{state.householdSize === 1 ? "pessoa" : "pessoas"}</span>
      </output>
      <div className="mt-7 flex gap-7">
        <button
          type="button"
          aria-label="Menos uma pessoa"
          disabled={state.householdSize === null || state.householdSize <= PEOPLE_MIN}
          onClick={() => dispatch({ type: "people", delta: -1 })}
          className={`${round} border-[1.5px] border-line bg-paper text-ink`}
        >
          <Minus aria-hidden className="size-6" />
        </button>
        <button
          type="button"
          aria-label="Mais uma pessoa"
          disabled={state.householdSize !== null && state.householdSize >= PEOPLE_MAX}
          onClick={() => dispatch({ type: "people", delta: 1 })}
          className={`${round} bg-brand text-white dark:text-ground`}
        >
          <Plus aria-hidden className="size-6" />
        </button>
      </div>
    </div>
  );
}

export function MerchantsStep({ state, dispatch }: { state: OnboardingState; dispatch: Dispatch<Action> }) {
  const merchants = useMerchants();
  if (merchants.isLoading) return <Spinner label="A carregar os mercados…" />;
  if (merchants.isError || !merchants.data) {
    return (
      <Notice
        tone="warning"
        title="Não foi possível carregar os mercados."
        action={
          <Button variant="secondary" onClick={() => merchants.refetch()}>
            Tentar de novo
          </Button>
        }
      >
        Pode saltar este passo e escolher mais tarde.
      </Notice>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {merchants.data.map(({ id, name }) => {
        const checked = state.merchants.includes(id);
        return (
          <ChoiceCard
            key={id}
            checked={checked}
            onChange={() => dispatch({ type: "toggleMerchant", id })}
            className="min-h-[6.5rem] flex-col items-center justify-center gap-2 px-1 py-2 text-center"
          >
            <MarketTile code={id} size={44} fontSize={22} />
            <span className="text-[0.8125rem] font-bold leading-tight [overflow-wrap:anywhere]">{name}</span>
            <Tick checked={checked} small className="absolute right-1.5 top-1.5" />
          </ChoiceCard>
        );
      })}
    </div>
  );
}

export function GoalAmountStep({ state, dispatch }: { state: OnboardingState; dispatch: Dispatch<Action> }) {
  const unknown = state.goalUnknown;
  const euros = state.goalEuros;
  // The bar starts at the minimum without an answer, and a range only reports a change when its value changes: lifting
  // the finger from it, or pressing a key that would go below it, is the answer «€ 50».
  const answerMinimum = () => {
    if (euros === null) dispatch({ type: "goalEuros", euros: GOAL_MIN_EUROS });
  };
  return (
    <div className="mt-8 flex flex-col items-center text-center">
      <p data-testid="goal-value" className={`font-display text-[clamp(3rem,20vw,5rem)] font-semibold leading-none ${unknown || euros === null ? "text-ink-soft" : ""}`}>
        {unknown ? "Ainda não sei" : euros === null ? NO_AMOUNT : formatWholeEuros(euros)}
      </p>
      <p className="mt-1 text-ink-soft">{unknown ? "Pode definir a sua meta pessoal mais tarde, nas Definições." : "por mês"}</p>
      <div className={`mt-10 w-full ${unknown ? "opacity-[.35]" : ""}`}>
        <input
          type="range"
          min={GOAL_MIN_EUROS}
          max={GOAL_MAX_EUROS}
          step={GOAL_STEP_EUROS}
          value={euros ?? GOAL_MIN_EUROS}
          disabled={unknown}
          aria-label="Meta pessoal mensal, em euros"
          aria-valuetext={euros === null ? "ainda sem valor" : `${euros} euros`}
          onChange={(e) => dispatch({ type: "goalEuros", euros: Number(e.target.value) })}
          onPointerUp={answerMinimum}
          onKeyDown={(e) => ["ArrowLeft", "ArrowDown", "Home"].includes(e.key) && answerMinimum()}
          className="h-11 w-full accent-brand"
        />
        <div className="flex justify-between text-sm text-ink-soft">
          <span>{formatWholeEuros(GOAL_MIN_EUROS)}</span>
          <span>{formatWholeEuros(GOAL_MAX_EUROS)}</span>
        </div>
      </div>
      <Button variant="outline" className="mt-5" onClick={() => dispatch({ type: "toggleGoalUnknown" })}>
        {unknown ? "Definir um valor" : "Ainda não sei"}
      </Button>
    </div>
  );
}
