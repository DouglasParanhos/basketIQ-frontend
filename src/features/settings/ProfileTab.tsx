import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router";
import type { Schemas } from "../../api/client";
import { MarketPill } from "../../components/MarketBadge";
import { Button, Notice, SMALL_CAPS, Spinner, Surface } from "../../components/ui";
import { formatCents } from "../../lib/format";
import { merchantName } from "../../lib/merchants";
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
  const merchantChips = saved.merchants.map((id) => ({ id, name: names?.find((m) => m.id === id)?.name ?? merchantName(id) }));
  const goals = GOAL_OPTIONS.filter(({ goal }) => saved.goals.includes(goal)).map(({ title }) => title);
  const people = saved.household_size === null ? null : `${saved.household_size} ${saved.household_size === 1 ? "pessoa" : "pessoas"}`;
  const big = (text: string) => <p className="mt-1 font-display text-2xl font-semibold">{text}</p>;
  const chips = (items: string[]) => (
    <ul className="mt-2 flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item} className="rounded-[14px] bg-brand-soft px-3 py-1 text-[13px] font-bold text-brand-deep">
          {item}
        </li>
      ))}
    </ul>
  );
  const marketChips = (
    <ul className="mt-2 flex flex-wrap gap-2">
      {merchantChips.map(({ id, name }) => (
        <li key={id}>
          <MarketPill code={id} name={name} />
        </li>
      ))}
    </ul>
  );
  const blocks: { block: Block; title: string; short: string; empty: boolean; value: ReactNode; note?: string }[] = [
    { block: "people", title: "Pessoas na casa", short: "pessoas na casa", empty: people === null, value: people && big(people) },
    { block: "merchants", title: "Onde faz compras", short: "mercados", empty: merchantChips.length === 0, value: marketChips },
    {
      block: "goal",
      title: "Meta pessoal do mês",
      short: "meta pessoal",
      empty: saved.monthly_goal_cents === null,
      value: saved.monthly_goal_cents !== null && big(formatCents(saved.monthly_goal_cents)),
      note: "Um objetivo seu, não um limite.",
    },
    { block: "goals", title: "Objetivos", short: "objetivos", empty: goals.length === 0, value: chips(goals) },
  ];
  return (
    <>
      {blocks.map(({ block, title, short, empty, value, note }) => (
        <Surface key={block} tone="bordered">
          <div className="flex items-center justify-between gap-3">
            <h3 className={SMALL_CAPS}>{title}</h3>
            <button
              type="button"
              data-edit={block}
              aria-label={`${empty ? "Definir" : "Editar"} ${short}`}
              onClick={() => onEdit(block)}
              className="-my-1 inline-flex min-h-11 items-center rounded-full px-2 text-sm font-bold text-brand hover:bg-brand-soft"
            >
              {empty ? "Definir" : "Editar"}
            </button>
          </div>
          {empty ? <p className="text-ink-soft">Ainda não definiu.</p> : value}
          {note && <p className="mt-1 text-sm text-ink-soft">{note}</p>}
        </Surface>
      ))}
    </>
  );
}
