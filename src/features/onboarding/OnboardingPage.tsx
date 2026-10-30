import { ArrowLeft, Check } from "lucide-react";
import { useEffect, useReducer, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { ApiError } from "../../api/client";
import { Button, Notice, Spinner } from "../../components/ui";
import { isConsentError, useMerchants, useProfile, useSaveProfile } from "../profile/useProfile";
import { buildPatch, initialState, LAST_STEP, progressPercent, reduce, STEP_COUNT, type OnboardingState, type Profile } from "./state";
import { GoalAmountStep, GoalsStep, MerchantsStep, PeopleStep, STEP_COPY } from "./steps";

const STEP_LABEL_ID = "onboarding-step";

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
  const navigate = useNavigate();
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Moving to another step (or to «Tudo pronto») puts the focus on the title.
  useEffect(() => {
    titleRef.current?.focus();
  }, [state.step, state.phase]);

  function send(from: OnboardingState) {
    save.mutate(buildPatch(from, merchants.data?.map((m) => m.id)), { onSuccess: () => dispatch({ type: "saved" }) });
  }

  function move(type: "next" | "skip") {
    const after = reduce(state, { type });
    dispatch({ type });
    if (state.step === LAST_STEP) send(after);
  }

  if (state.phase === "done") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <span aria-hidden className="grid size-20 place-items-center rounded-full bg-brand-soft text-brand">
            <Check className="size-10" strokeWidth={2.5} />
          </span>
          <h1 ref={titleRef} tabIndex={-1} className="text-[2.125rem] font-extrabold leading-tight outline-none">
            Tudo pronto
          </h1>
          <p className="text-ink-soft">Pode editar estas respostas no Perfil a qualquer momento.</p>
        </div>
        <div className="pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <Button
            className="w-full"
            onClick={() => navigate("/", { replace: true })}
          >
            Ir para o início
          </Button>
        </div>
      </main>
    );
  }

  const copy = STEP_COPY[state.step] ?? STEP_COPY[0];
  const percent = progressPercent(state.step);
  const problem = save.error ? saveProblem(save.error) : null;

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
            <ArrowLeft aria-hidden className="size-5" />
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
          className="h-1.5 flex-1 rounded-full bg-line"
        >
          <div className="h-full rounded-full bg-brand transition-[width] motion-reduce:transition-none" style={{ width: `${percent}%` }} />
        </div>
        <Button variant="quiet" className="min-h-11 px-3" disabled={save.isPending} onClick={() => move("skip")}>
          Saltar
        </Button>
      </header>

      <div className="flex-1 pt-6">
        <p id={STEP_LABEL_ID} className="text-sm font-semibold text-ink-soft">{`Passo ${state.step + 1} de ${STEP_COUNT}`}</p>
        <h1 ref={titleRef} tabIndex={-1} aria-describedby={STEP_LABEL_ID} className="mt-1 text-[2rem] font-extrabold leading-tight tracking-tight outline-none">
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
        <Button className="w-full" busy={save.isPending} onClick={() => move("next")}>
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
