import { Info, Plus } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useAnnounce } from "../../components/Announce";
import { Button, ErrorNotice, Notice } from "../../components/ui";
import { plural } from "../../lib/format";
import { EditSheet, AddSheet } from "./ItemSheet";
import { InfoNote } from "./InfoNote";
import { ItemRow } from "./ItemRow";
import { SupermarketPicker } from "./SupermarketPicker";
import { UndoNotice } from "./UndoNotice";
import { isTemp, useOnline, useShoppingList, useShoppingListActions, type ShoppingItem } from "./useShoppingList";

function Skeleton() {
  return (
    <div role="status" aria-label="A carregar a lista" className="flex flex-col gap-3 pt-2">
      {[0, 1, 2, 3, 4].map((n) => (
        <div key={n} className="h-14 rounded-surface bg-line motion-safe:animate-pulse" />
      ))}
    </div>
  );
}

/** G1: the shopping list. One list, in category groups; the box is «no carrinho», the three dots hold the rest. */
export function ListaPage() {
  const query = useShoppingList();
  const act = useShoppingListActions();
  const announce = useAnnounce();
  const online = useOnline();
  const infoId = useId();
  const [info, setInfo] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ShoppingItem | null>(null);
  const [removed, setRemoved] = useState<{ item: ShoppingItem; index: number } | null>(null);

  const list = query.data;

  // An edited item can move to another group (the screen and then the server's answer redraw the list): the focus goes
  // to the three dots of its new place, but only while the person has not moved it elsewhere (focus on the page).
  const [refocus, setRefocus] = useState<string | null>(null);
  useEffect(() => {
    const focus = document.activeElement;
    if (refocus && (!focus || focus === document.body)) document.getElementById(`menu-${refocus}`)?.focus();
  }, [refocus, list]);
  useEffect(() => {
    if (!refocus) return;
    const timer = window.setTimeout(() => setRefocus(null), 1000);
    return () => window.clearTimeout(timer);
  }, [refocus]);

  function remove(item: ShoppingItem) {
    const index = list?.items.findIndex((i) => i.id === item.id) ?? 0;
    act.remove(item.id);
    setRemoved({ item, index });
    announce(`${item.name} removido da lista.`);
  }

  function undo() {
    if (!removed) return;
    act.restore(removed);
    announce(`${removed.item.name} voltou à lista.`);
    setRemoved(null);
  }

  const groups = list ? list.categories.map((c) => ({ ...c, items: list.items.filter((i) => i.category === c.id) })).filter((g) => g.items.length > 0) : [];

  return (
    <div className="flex flex-col gap-3 pb-40 pt-6">
      <header>
        <h1 className="font-display text-[length:calc(2rem_*_var(--text-scale))] font-semibold leading-tight">Lista de compras</h1>
        {list && (
          <p className="text-ink-soft">
            {plural(list.items_total, "produto", "produtos")} · {list.checked_count} no carrinho
          </p>
        )}
      </header>

      {query.isLoading && <Skeleton />}
      {query.error && !list && <ErrorNotice what="carregar a lista" error={query.error} onRetry={() => void query.refetch()} />}
      {!online && (
        <Notice tone="warning" title="Sem ligação · a guardar quando voltar" />
      )}
      {act.failed && <ErrorNotice what="guardar a alteração" error={act.failed.error} onRetry={act.failed.retry} />}

      {list && (
        <>
          <SupermarketPicker list={list} onChoose={act.setMerchant} />
          <div className="flex items-start gap-2">
            <p className="flex-1 text-sm text-ink-soft">
              Preços esperados, não de hoje. Não inclui os {list.already_have_excluded > 0 ? `${list.already_have_excluded} ` : ""}«Já tenho».
            </p>
            <button
              type="button"
              aria-label="Como calculamos os valores"
              aria-expanded={info}
              aria-controls={infoId}
              onClick={() => setInfo(!info)}
              className="grid size-11 shrink-0 place-items-center rounded-full text-brand ring-1 ring-inset ring-brand"
            >
              <Info aria-hidden className="size-5" />
            </button>
          </div>
          {info && <InfoNote id={infoId} onClose={() => setInfo(false)} />}

          {list.items.length === 0 ? (
            <Notice tone="info" title="A sua lista está vazia." action={<Button onClick={() => setAdding(true)}>Adicionar</Button>} />
          ) : (
            groups.map((g) => (
              <section key={g.id} aria-labelledby={`group-${g.id}`}>
                <h2 id={`group-${g.id}`} className="py-2 text-xs font-semibold uppercase tracking-widest text-ink-soft">
                  {g.name}
                </h2>
                <ul className="overflow-hidden rounded-surface bg-paper px-2 ring-1 ring-inset ring-line">
                  {g.items.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      onCheck={(checked) => {
                        act.check(item.id, checked);
                        announce(`${item.name} ${checked ? "no carrinho" : "fora do carrinho"}.`);
                      }}
                      onHaveAtHome={(already_have) => act.haveAtHome(item.id, already_have)}
                      onEdit={() => setEditing(item)}
                      onRemove={() => remove(item)}
                    />
                  ))}
                </ul>
              </section>
            ))
          )}
        </>
      )}

      <Button size="lg" onClick={() => setAdding(true)} className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-5 z-30 shadow-lg md:bottom-8">
        <Plus aria-hidden className="size-5" strokeWidth={2.6} /> Adicionar
      </Button>

      {removed && <UndoNotice key={removed.item.id} name={removed.item.name} onUndo={undo} onGone={() => setRemoved(null)} />}
      {adding && <AddSheet onClose={() => setAdding(false)} onAdd={act.add} />}
      {editing && list && !isTemp(editing) && (
        <EditSheet
          item={editing}
          categories={list.categories}
          onClose={() => setEditing(null)}
          onSave={(changes) => {
            act.edit(editing.id, changes);
            setRefocus(editing.id);
            announce(`${changes.name} guardado.`);
          }}
        />
      )}
    </div>
  );
}
