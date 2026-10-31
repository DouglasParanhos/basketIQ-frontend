import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import type { Schemas } from "../../api/client";
import { Button, Notice, Spinner, Surface } from "../../components/ui";
import { formatCents, merchantName } from "../../lib/format";
import { GOAL_OPTIONS } from "../profile/goals";
import { useMerchants, useProfile } from "../profile/useProfile";
import { ProfileEditor, type Block } from "./ProfileEditor";

type Profile = Schemas["ProfileOut"];

/** Perfil: the saved profile in four blocks, or the whole profile in edit mode (any «Editar» opens it). */
export function ProfileTab() {
  const profile = useProfile();
  const merchants = useMerchants();
  const [params, setParams] = useSearchParams();
  const wantsEdit = params.has("editar");
  // ?editar=meta opens the editing on the goal; any other value opens it without a particular block.
  const linkedEdit = { focus: params.get("editar") === "meta" ? ("goal" as const) : null };
  const [editing, setEditing] = useState<{ focus: Block | null } | null>(wantsEdit ? linkedEdit : null);
  const [justSaved, setJustSaved] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  const afterLeaving = useRef<"title" | Block | null>(null);

  // A link with ?editar=… while already on the Perfil also opens the editing.
  useEffect(() => {
    if (wantsEdit) {
      setEditing((current) => current ?? linkedEdit);
      setJustSaved(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- linkedEdit is derived from params
  }, [wantsEdit, params]);

  // Leaving the editing: the focus goes to the title (after saving) or back to the «Editar» button the person used.
  useEffect(() => {
    if (editing || !afterLeaving.current) return;
    const target = afterLeaving.current === "title" ? title.current : document.querySelector<HTMLElement>(`[data-edit=${afterLeaving.current}]`);
    afterLeaving.current = null;
    target?.focus();
  }, [editing]);

  if (profile.isLoading) return <Spinner />;
  if (profile.isError || !profile.data) {
    return (
      <Notice
        tone="error"
        title="Não foi possível carregar o perfil."
        action={
          <Button variant="secondary" onClick={() => profile.refetch()}>
            Tentar de novo
          </Button>
        }
      />
    );
  }
  const saved = profile.data;

  function done(wasSaved: boolean, origin: Block | null) {
    afterLeaving.current = wasSaved ? "title" : origin;
    setJustSaved(wasSaved);
    setEditing(null);
    if (wantsEdit) {
      const rest = new URLSearchParams(params);
      rest.delete("editar");
      setParams(rest, { replace: true });
    }
  }

  if (editing) return <ProfileEditor saved={saved} focus={editing.focus} onDone={done} />;
  return (
    <div className="flex flex-col gap-4">
      <h2 ref={title} tabIndex={-1} className="text-lg font-bold">
        Perfil
      </h2>
      {justSaved && (
        <p role="status" className="text-sm font-semibold text-ok">
          Perfil guardado.
        </p>
      )}
      <ReadBlocks saved={saved} names={merchants.data} onEdit={(focus) => { setJustSaved(false); setEditing({ focus }); }} />
    </div>
  );
}

function ReadBlocks({ saved, names, onEdit }: { saved: Profile; names: Schemas["MerchantOut"][] | undefined; onEdit: (block: Block) => void }) {
  const merchantNames = saved.merchants.map((id) => names?.find((m) => m.id === id)?.name ?? merchantName(id)).join(", ");
  const goals = GOAL_OPTIONS.filter(({ goal }) => saved.goals.includes(goal)).map(({ title }) => title).join(", ");
  const people = saved.household_size === null ? null : `${saved.household_size} ${saved.household_size === 1 ? "pessoa" : "pessoas"}`;
  const blocks: { block: Block; title: string; short: string; value: string | null; note?: string }[] = [
    { block: "people", title: "Pessoas na casa", short: "pessoas na casa", value: people },
    { block: "merchants", title: "Onde faz compras", short: "mercados", value: merchantNames || null },
    { block: "goal", title: "Meta pessoal do mês", short: "meta pessoal", value: saved.monthly_goal_cents === null ? null : formatCents(saved.monthly_goal_cents), note: "Um objetivo seu, não um limite." },
    { block: "goals", title: "Objetivos", short: "objetivos", value: goals || null },
  ];
  return (
    <>
      {blocks.map(({ block, title, short, value, note }) => (
        <Surface key={block}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-bold">{title}</h3>
              {value === null ? <p className="mt-1 text-ink-soft">Ainda não definiu.</p> : <p className="mt-1">{value}</p>}
              {note && <p className="mt-1 text-sm text-ink-soft">{note}</p>}
            </div>
            <Button variant="quiet" data-edit={block} aria-label={`${value === null ? "Definir" : "Editar"} ${short}`} onClick={() => onEdit(block)}>
              {value === null ? "Definir" : "Editar"}
            </Button>
          </div>
        </Surface>
      ))}
    </>
  );
}
