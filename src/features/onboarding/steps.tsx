import { Check, Minus, Plus } from "lucide-react";
import type { ChangeEventHandler, Dispatch, ReactNode } from "react";
import { Button, Notice, Spinner } from "../../components/ui";
import { formatWholeEuros } from "../../lib/format";
import { useMerchants } from "../profile/useProfile";
import {
  GOAL_MAX_EUROS,
  GOAL_MIN_EUROS,
  GOAL_STEP_EUROS,
  PEOPLE_MAX,
  PEOPLE_MIN,
  isAllGoals,
  initialsOf,
  type Action,
  type Goal,
  type OnboardingState,
} from "./state";

/** Title and help line of each step, by step index. */
export const STEP_COPY = [
  { title: "Qual é o seu objetivo com a aplicação?", hint: "Escolha quantos quiser." },
  { title: "Quantas pessoas vivem em sua casa?", hint: "Pode alterar este número mais tarde, no Perfil." },
  { title: "Onde costuma fazer compras?", hint: "Escolha todos os mercados que usa." },
  { title: "Qual é a sua meta pessoal por mês?", hint: "Por mês. Pode mudá-la quando quiser." },
] as const;

const GOAL_OPTIONS: { goal: Goal; title: string; hint: string }[] = [
  { goal: "finances", title: "Organizar as minhas finanças", hint: "Ver quanto gasto e onde" },
  { goal: "shopping_list", title: "Ajuda com a lista de compras", hint: "Saber o que costumo comprar" },
  { goal: "savings", title: "Gastar menos nas compras", hint: "Acompanhar o que gasto ao longo do tempo" },
];

/** The state of a choice is shown by a tick as well as by the frame: colour is never the only sign. */
function Tick({ checked, className = "" }: { checked: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={`grid size-7 shrink-0 place-items-center rounded-full ${checked ? "bg-brand text-white dark:text-ground" : "border-2 border-line"} ${className}`}
    >
      {checked && <Check className="size-4" strokeWidth={3} />}
    </span>
  );
}

function ChoiceCard({
  checked,
  onChange,
  className = "",
  children,
}: {
  checked: boolean;
  onChange: ChangeEventHandler<HTMLInputElement>;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label
      className={`relative flex min-h-16 cursor-pointer rounded-surface border-2 bg-paper p-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand ${checked ? "border-brand" : "border-line"} ${className}`}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      {children}
    </label>
  );
}

export function GoalsStep({ state, dispatch }: { state: OnboardingState; dispatch: Dispatch<Action> }) {
  const rows: { key: string; title: string; hint: string; checked: boolean; action: Action }[] = [
    ...GOAL_OPTIONS.map(({ goal, title, hint }) => ({ key: goal, title, hint, checked: state.goals.includes(goal), action: { type: "toggleGoal", goal } as Action })),
    { key: "all", title: "Todas as anteriores", hint: "Quero tudo isso", checked: isAllGoals(state.goals), action: { type: "toggleAllGoals" } },
  ];
  return (
    <div className="flex flex-col gap-3">
      {rows.map(({ key, title, hint, checked, action }) => (
        <ChoiceCard key={key} checked={checked} onChange={() => dispatch(action)} className="items-center gap-3">
          <span className="flex-1">
            <span className="block font-bold">{title}</span>
            <span className="block text-sm text-ink-soft">{hint}</span>
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
    <div className="mt-10 flex flex-col items-center gap-2 text-center">
      <output aria-live="polite" className="flex flex-col items-center">
        <span className="text-[clamp(4.5rem,30vw,7.5rem)] font-extrabold leading-none tabular-nums">{state.householdSize}</span>{" "}
        <span className="text-base text-ink-soft">{state.householdSize === 1 ? "pessoa" : "pessoas"}</span>
      </output>
      <div className="mt-6 flex gap-7">
        <button
          type="button"
          aria-label="Menos uma pessoa"
          disabled={state.householdSize <= PEOPLE_MIN}
          onClick={() => dispatch({ type: "people", delta: -1 })}
          className={`${round} border-2 border-line bg-paper text-ink`}
        >
          <Minus aria-hidden className="size-6" />
        </button>
        <button
          type="button"
          aria-label="Mais uma pessoa"
          disabled={state.householdSize >= PEOPLE_MAX}
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
            className="min-h-28 flex-col items-center justify-center gap-2 px-1 py-2 text-center"
          >
            <span aria-hidden className="grid size-11 place-items-center rounded-control bg-brand-soft text-lg font-extrabold text-brand-deep">
              {initialsOf(name)}
            </span>
            <span className="text-[0.8125rem] font-bold leading-tight [overflow-wrap:anywhere]">{name}</span>
            <Tick checked={checked} className="absolute right-1.5 top-1.5 size-5" />
          </ChoiceCard>
        );
      })}
    </div>
  );
}

export function GoalAmountStep({ state, dispatch }: { state: OnboardingState; dispatch: Dispatch<Action> }) {
  const unknown = state.goalUnknown;
  return (
    <div className="mt-8 flex flex-col items-center text-center">
      <p data-testid="goal-value" className={`text-[clamp(3rem,20vw,5rem)] font-extrabold leading-none tabular-nums ${unknown ? "text-ink-soft" : ""}`}>
        {unknown ? "Ainda não sei" : formatWholeEuros(state.goalEuros)}
      </p>
      <p className="mt-2 text-ink-soft">{unknown ? "Pode definir a sua meta pessoal mais tarde, nas Definições." : "por mês"}</p>
      <div className={`mt-8 w-full ${unknown ? "opacity-50" : ""}`}>
        <input
          type="range"
          min={GOAL_MIN_EUROS}
          max={GOAL_MAX_EUROS}
          step={GOAL_STEP_EUROS}
          value={state.goalEuros}
          disabled={unknown}
          aria-label="Meta pessoal mensal, em euros"
          aria-valuetext={`${state.goalEuros} euros`}
          onChange={(e) => dispatch({ type: "goalEuros", euros: Number(e.target.value) })}
          className="h-11 w-full accent-brand"
        />
        <div className="flex justify-between text-sm text-ink-soft">
          <span>{formatWholeEuros(GOAL_MIN_EUROS)}</span>
          <span>{formatWholeEuros(GOAL_MAX_EUROS)}</span>
        </div>
      </div>
      <Button variant="secondary" className="mt-5" onClick={() => dispatch({ type: "toggleGoalUnknown" })}>
        {unknown ? "Definir um valor" : "Ainda não sei"}
      </Button>
    </div>
  );
}
