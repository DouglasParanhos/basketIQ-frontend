import { Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Schemas } from "../../api/client";
import { ChoiceCard, Tick } from "../../components/Choice";
import { Button, Field, Notice, Spinner, Surface } from "../../components/ui";
import { initialsOf, toggle } from "../onboarding/state";
import { GOAL_OPTIONS } from "../profile/goals";
import { useMerchants, useSaveProfile } from "../profile/useProfile";
import { buildPatch, countChanges, initialDraft, stepPeople, validate } from "./profileDraft";

type Profile = Schemas["ProfileOut"];
export type Block = "people" | "merchants" | "goal" | "goals";

const round = "grid size-12 shrink-0 place-items-center rounded-full disabled:cursor-not-allowed disabled:opacity-40";

/** The whole profile in edit mode: the counter, the fields, «Guardar alterações» and «Cancelar» (with confirmation). */
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

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    save.mutate(buildPatch(draft, saved, merchants.data?.map((m) => m.id)), { onSuccess: () => onDone(true, focus) });
  }

  return (
    <form ref={root} onSubmit={submit} className="flex flex-col gap-4">
      <h2 tabIndex={-1} className="text-lg font-bold">
        Editar perfil
      </h2>

      <Surface>
        <h3 data-block="people" tabIndex={-1} className="font-bold">
          Pessoas na casa
        </h3>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <button type="button" aria-label="Menos uma pessoa" disabled={draft.people === null || draft.people <= 1} onClick={() => setDraft({ ...draft, people: stepPeople(draft.people, -1) })} className={`${round} border-2 border-line bg-paper text-ink`}>
            <Minus aria-hidden className="size-5" />
          </button>
          <output aria-live="polite" className="min-w-16 text-center text-3xl font-extrabold tabular-nums">
            {draft.people ?? "—"}
          </output>
          <button type="button" aria-label="Mais uma pessoa" disabled={draft.people !== null && draft.people >= 12} onClick={() => setDraft({ ...draft, people: stepPeople(draft.people, 1) })} className={`${round} bg-brand text-white dark:text-ground`}>
            <Plus aria-hidden className="size-5" />
          </button>
          {draft.people !== null && (
            <Button type="button" variant="quiet" onClick={() => setDraft({ ...draft, people: null })}>
              Não indicar
            </Button>
          )}
        </div>
      </Surface>

      <Surface>
        <h3 data-block="merchants" tabIndex={-1} className="font-bold">
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
            <div className="grid grid-cols-3 gap-2.5">
              {merchants.data.map(({ id, name }) => {
                const checked = draft.merchants.includes(id);
                return (
                  <ChoiceCard key={id} checked={checked} onChange={() => setDraft({ ...draft, merchants: toggle(draft.merchants, id) })} className="min-h-28 flex-col items-center justify-center gap-2 px-1 py-2 text-center">
                    <span aria-hidden className="grid size-11 place-items-center rounded-control bg-brand-soft text-lg font-extrabold text-brand-deep">
                      {initialsOf(name)}
                    </span>
                    <span className="text-[0.8125rem] font-bold leading-tight [overflow-wrap:anywhere]">{name}</span>
                    <Tick checked={checked} className="absolute right-1.5 top-1.5 size-5" />
                  </ChoiceCard>
                );
              })}
            </div>
          )}
        </div>
      </Surface>

      <Surface>
        <h3 data-block="goal" tabIndex={-1} className="font-bold">
          Meta pessoal do mês
        </h3>
        <Field
          className="mt-3"
          label="Meta pessoal do mês (€)"
          inputMode="decimal"
          autoComplete="off"
          value={draft.goalText}
          onChange={(event) => setDraft({ ...draft, goalText: event.target.value })}
          error={errors.goal}
          hint="Um objetivo seu, não um limite. Deixe vazio para não ter meta."
        />
      </Surface>

      <Surface>
        <h3 data-block="goals" tabIndex={-1} className="font-bold">
          Objetivos
        </h3>
        <div className="mt-3 flex flex-col gap-2.5">
          {GOAL_OPTIONS.map(({ goal, title, hint }) => {
            const checked = draft.goals.includes(goal);
            return (
              <ChoiceCard key={goal} checked={checked} onChange={() => setDraft({ ...draft, goals: toggle(draft.goals, goal) })} className="items-center gap-3">
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

      <p role="status" className="text-sm font-semibold">
        {changes === 0 ? "Sem alterações" : `${changes} ${changes === 1 ? "alteração" : "alterações"} por guardar`}
      </p>

      {confirmingCancel ? (
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
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={!canSave} busy={save.isPending}>
            Guardar alterações
          </Button>
          <Button type="button" variant="quiet" onClick={() => (changes > 0 ? setConfirmingCancel(true) : onDone(false, focus))}>
            Cancelar
          </Button>
        </div>
      )}
    </form>
  );
}
