import { Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Schemas } from "../../api/client";
import { ChoiceCard, Tick } from "../../components/Choice";
import { FullScreen } from "../../components/FullScreen";
import { MarketPill } from "../../components/MarketBadge";
import { Button, Field, Notice, ROUND_BUTTON, ROUND_NEUTRAL, Spinner, Surface } from "../../components/ui";
import { toggle } from "../onboarding/state";
import { GOAL_OPTIONS } from "../profile/goals";
import { useMerchants, useSaveProfile } from "../profile/useProfile";
import { buildPatch, countChanges, initialDraft, stepPeople, validate } from "./profileDraft";

type Profile = Schemas["ProfileOut"];
export type Block = "people" | "merchants" | "goal" | "goals";

const FORM_ID = "profile-form";

/** The whole profile in edit mode, as a full screen: «Cancelar» (with confirmation) at the top, the counter and «Guardar alterações» pinned at the foot. */
export function ProfileEditor({ saved, focus, onDone }: { saved: Profile; focus: Block | null; onDone: (saved: boolean, origin: Block | null) => void }) {
  const [draft, setDraft] = useState(() => initialDraft(saved));
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const merchants = useMerchants();
  const save = useSaveProfile();
  const root = useRef<HTMLFormElement>(null);

  // On entering, the focus goes to the block the person chose (the goal field, for the goal).
  useEffect(() => {
    if (!focus) return;
    const target = focus === "goal" ? root.current?.querySelector<HTMLElement>("input[inputmode=decimal]") : root.current?.querySelector<HTMLElement>(`[data-block=${focus}]`);
    target?.focus();
  }, [focus]);

  const changes = countChanges(draft, saved);
  const errors = validate(draft);
  const canSave = changes > 0 && !errors.goal && !save.isPending;
  const leave = () => (changes > 0 ? setConfirmingCancel(true) : onDone(false, focus));

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    save.mutate(buildPatch(draft, saved, merchants.data?.map((m) => m.id)), { onSuccess: () => onDone(true, focus) });
  }

  return (
    <FullScreen
      title="Editar perfil"
      start={
        <button type="button" onClick={leave} className="inline-flex min-h-11 items-center rounded-full px-2 text-[15px] font-bold text-ink-soft hover:bg-brand-soft">
          Cancelar
        </button>
      }
      footer={
        confirmingCancel ? (
          <Notice tone="warning" title={`Descartar as ${changes} ${changes === 1 ? "alteração" : "alterações"}?`}>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" variant="danger" onClick={() => onDone(false, focus)}>
                Descartar
              </Button>
              <Button type="button" variant="secondary" onClick={() => setConfirmingCancel(false)}>
                Continuar a editar
              </Button>
            </div>
          </Notice>
        ) : (
          <>
            <p role="status" className={`text-center text-xs font-bold ${changes === 0 ? "text-ink-soft" : "text-warn-ink"}`}>
              {changes === 0 ? "Sem alterações" : `${changes} ${changes === 1 ? "alteração" : "alterações"} por guardar`}
            </p>
            <Button type="submit" form={FORM_ID} size="lg" className="w-full" disabled={!canSave} busy={save.isPending}>
              Guardar alterações
            </Button>
          </>
        )
      }
    >
      <form id={FORM_ID} ref={root} onSubmit={submit} className="flex flex-col gap-3">
        <Surface tone="bordered">
          <div className="flex items-center justify-between gap-3">
            <h3 data-block="people" tabIndex={-1} className="text-[15px] font-bold">
              Pessoas na casa
            </h3>
            <div className="flex items-center gap-3">
              <button type="button" aria-label="Menos uma pessoa" disabled={draft.people === null || draft.people <= 1} onClick={() => setDraft({ ...draft, people: stepPeople(draft.people, -1) })} className={ROUND_NEUTRAL}>
                <Minus aria-hidden className="size-5" />
              </button>
              <output aria-live="polite" className="min-w-8 text-center font-display text-[26px] font-semibold leading-none">
                {draft.people ?? "—"}
              </output>
              <button
                type="button"
                aria-label="Mais uma pessoa"
                disabled={draft.people !== null && draft.people >= 12}
                onClick={() => setDraft({ ...draft, people: stepPeople(draft.people, 1) })}
                className={`${ROUND_BUTTON} border-brand bg-brand text-white hover:border-brand-deep dark:text-ground`}
              >
                <Plus aria-hidden className="size-5" />
              </button>
            </div>
          </div>
          {draft.people !== null && (
            <Button type="button" variant="quiet" className="-mb-2 mt-1" onClick={() => setDraft({ ...draft, people: null })}>
              Não indicar
            </Button>
          )}
        </Surface>

        <Surface tone="bordered">
          <h3 data-block="merchants" tabIndex={-1} className="text-[15px] font-bold">
            Onde faz compras
          </h3>
          <div className="mt-3">
            {merchants.isLoading ? (
              <Spinner label="A carregar os mercados…" />
            ) : merchants.isError || !merchants.data ? (
              <Notice
                tone="warning"
                title="Não foi possível carregar os mercados."
                action={
                  <Button type="button" variant="secondary" onClick={() => merchants.refetch()}>
                    Tentar de novo
                  </Button>
                }
              >
                Os mercados guardados mantêm-se.
              </Notice>
            ) : (
              <div className="flex flex-wrap gap-2">
                {merchants.data.map(({ id, name }) => {
                  const checked = draft.merchants.includes(id);
                  return (
                    <label key={id} className="inline-flex min-h-11 cursor-pointer items-center rounded-full has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand">
                      <input type="checkbox" checked={checked} onChange={() => setDraft({ ...draft, merchants: toggle(draft.merchants, id) })} className="sr-only" />
                      <MarketPill code={id} name={name} selected={checked} checkmark />
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </Surface>

        <Surface tone="bordered">
          <h3 data-block="goal" tabIndex={-1} className="text-[15px] font-bold">
            Meta pessoal do mês
          </h3>
          <Field
            className="mt-3"
            label="Meta pessoal do mês (€)"
            hideLabel
            inputMode="decimal"
            autoComplete="off"
            value={draft.goalText}
            onChange={(event) => setDraft({ ...draft, goalText: event.target.value })}
            error={errors.goal}
            hint="Um objetivo seu, não um limite. Deixe vazio para não ter meta."
          />
        </Surface>

        <Surface tone="bordered">
          <h3 data-block="goals" tabIndex={-1} className="text-[15px] font-bold">
            Objetivos
          </h3>
          <div className="mt-3 flex flex-col gap-2.5">
            {GOAL_OPTIONS.map(({ goal, title, hint }) => {
              const checked = draft.goals.includes(goal);
              return (
                <ChoiceCard key={goal} checked={checked} onChange={() => setDraft({ ...draft, goals: toggle(draft.goals, goal) })} className="min-h-16 items-center gap-3 p-3">
                  <span className="flex-1">
                    <span className="block font-bold">{title}</span>
                    <span className="block text-sm text-ink-soft">{hint}</span>
                  </span>
                  <Tick checked={checked} />
                </ChoiceCard>
              );
            })}
          </div>
        </Surface>

        {save.isError && <Notice tone="error" title="Não foi possível guardar. Tente de novo." />}
      </form>
    </FullScreen>
  );
}
