import { Check, ChevronLeft } from "lucide-react";
import { useEffect, useReducer, useRef, useState } from "react";
import { Link, Navigate } from "react-router";
import { ApiError } from "../../api/client";
import { Button, LinkButton, Notice, Spinner } from "../../components/ui";
import { isConsentError, useMerchants, useProfile, useSaveProfile } from "../profile/useProfile";
import { buildPatch, canAdvance, initialState, LAST_STEP, progressPercent, reduce, STEP_COUNT, type OnboardingState, type Profile } from "./state";
import { GoalAmountStep, GoalsStep, MerchantsStep, PeopleStep, STEP_COPY } from "./steps";

const STEP_LABEL_ID = "onboarding-step";
const BLOCKED_ID = "onboarding-blocked";

/** What to tell the person when the PATCH did not go through. */
function saveProblem(error: Error): { text: string; consent?: boolean; retry?: boolean } {
  if (isConsentError(error)) return { text: "A política de privacidade mudou. Confirme-a para continuar.", consent: true };
  if (error instanceof ApiError && error.status === 422) {
    return { text: error.fieldErrors[0]?.message ?? error.message };
  }
  return { text: "Não foi possível guardar. Tente de novo.", retry: true };
}

function Onboarding({ saved }: { saved: Profile | null }) {
  const [state, dispatch] = useReducer(reduce, saved, initialState);
  const merchants = useMerchants();
  const save = useSaveProfile();
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Moving to another step (or to «Tudo pronto») puts the focus on the title.
  useEffect(() => {
    titleRef.current?.focus();
  }, [state.step, state.phase]);

  function send(from: OnboardingState) {
    save.mutate(buildPatch(from, merchants.data?.map((m) => m.id)), { onSuccess: () => dispatch({ type: "saved" }) });
  }

  function move(type: "next" | "skip") {
    // «Avançar» without an answer does nothing (the button says so with aria-disabled); «Saltar» is the way past.
    if (type === "next" && !canAdvance(state)) return;
    const after = reduce(state, { type });
    dispatch({ type });
    if (state.step === LAST_STEP) send(after);
  }

  if (state.phase === "done") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-7">
        <div className="flex flex-1 flex-col items-center justify-center gap-3.5 text-center">
          <span aria-hidden className="grid size-[84px] place-items-center rounded-full bg-brand-soft text-brand">
            <Check className="size-10" strokeWidth={2.5} />
          </span>
          <h1 ref={titleRef} tabIndex={-1} className="font-display text-[2.125rem] font-semibold leading-tight outline-none">
            Tudo pronto
          </h1>
          <p className="leading-6 text-ink-soft">Pode editar estas respostas no Perfil a qualquer momento.</p>
        </div>
        {/* The text is 28 px from the edges, the buttons 24 px (the design). */}
        <div className="-mx-1 flex flex-col gap-2.5 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
          <LinkButton to="/adicionar" replace size="lg" className="w-full">
            Adicionar o meu primeiro talão
          </LinkButton>
          <LinkButton to="/" replace variant="quiet" className="min-h-[52px] w-full border-[1.5px] border-brand text-[0.9375rem] font-bold">
            Ver o início
          </LinkButton>
        </div>
      </main>
    );
  }

  const copy = STEP_COPY[state.step] ?? STEP_COPY[0];
  const percent = progressPercent(state.step);
  const problem = save.error ? saveProblem(save.error) : null;
  const blocked = !canAdvance(state);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6">
      <header className="flex items-center gap-3 pt-4">
        {state.step > 0 ? (
          <button
            type="button"
            aria-label="Voltar"
            onClick={() => dispatch({ type: "back" })}
            className="grid size-11 place-items-center rounded-full text-ink hover:bg-brand-soft"
          >
            <ChevronLeft aria-hidden className="size-[22px]" />
          </button>
        ) : (
          <span aria-hidden className="size-11" />
        )}
        <div
          role="progressbar"
          aria-label="Progresso do onboarding"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-[5px] flex-1 rounded-full bg-line"
        >
          <div className="h-full rounded-full bg-brand transition-[width] motion-reduce:transition-none" style={{ width: `${percent}%` }} />
        </div>
        <button
          type="button"
          disabled={save.isPending}
          onClick={() => move("skip")}
          className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-ink-soft hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          Saltar
        </button>
      </header>

      <div className="flex-1 pt-6">
        <p id={STEP_LABEL_ID} className="sr-only">{`Passo ${state.step + 1} de ${STEP_COUNT}`}</p>
        <h1 ref={titleRef} tabIndex={-1} aria-describedby={STEP_LABEL_ID} className="mt-1 font-display text-[2rem] font-semibold leading-[1.12] tracking-[-0.01em] outline-none">
          {copy.title}
        </h1>
        <p className="mt-2 text-ink-soft">{copy.hint}</p>
        <div className="mt-6">
          {state.step === 0 && <GoalsStep state={state} dispatch={dispatch} />}
          {state.step === 1 && <PeopleStep state={state} dispatch={dispatch} />}
          {state.step === 2 && <MerchantsStep state={state} dispatch={dispatch} />}
          {state.step === 3 && <GoalAmountStep state={state} dispatch={dispatch} />}
        </div>
      </div>

      <div className="sticky bottom-0 flex flex-col gap-3 bg-ground pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
        {problem && (
          <Notice
            tone="error"
            action={
              problem.consent ? (
                <Link className="font-semibold text-brand underline" to="/privacidade" state={{ from: "/boas-vindas" }}>
                  Ver a política de privacidade
                </Link>
              ) : problem.retry ? (
                <Button variant="secondary" onClick={() => send(state)}>
                  Tentar de novo
                </Button>
              ) : undefined
            }
          >
            {problem.text}
          </Notice>
        )}
        {/* aria-disabled, not disabled: it stays in the tab order and the screen reader reads why it does not go on. */}
        <p id={BLOCKED_ID} className="min-h-[18px] text-center text-xs leading-[1.4] text-ink-soft">
          {blocked ? copy.blocked : ""}
        </p>
        <Button
          size="lg"
          className={`w-full rounded-[28px] ${blocked ? "opacity-40" : ""}`}
          busy={save.isPending}
          aria-disabled={blocked || undefined}
          aria-describedby={blocked ? BLOCKED_ID : undefined}
          onClick={() => move("next")}
        >
          {state.step === LAST_STEP ? "Concluir" : "Avançar"}
        </Button>
      </div>
    </main>
  );
}

/**
 * `/boas-vindas`: the four steps. Whoever already finished goes to the Início (changing answers is the Perfil's job);
 * otherwise it starts from the saved profile (values without conclusion) or from the suggestions. Decided once, when the
 * profile first arrives: a later refresh must not take the person away from «Tudo pronto».
 */
function Entry({ first }: { first: Profile | null }) {
  const [profile] = useState(first);
  if (profile?.onboarding_completed_at) return <Navigate to="/" replace />;
  return <Onboarding saved={profile} />;
}

export default function OnboardingPage() {
  const profile = useProfile();
  if (profile.isLoading) return <Spinner />;
  return <Entry first={profile.data ?? null} />;
}
