import { Check, ChevronDown, Home, Pencil, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { ActionMenu } from "../../components/ActionMenu";
import { NoInfoStamp } from "../../components/NoInfoStamp";
import { expectedText, quantityText } from "./listFormat";
import { PriceEvolution } from "./PriceEvolution";
import { isTemp, type ShoppingItem } from "./useShoppingList";

interface Props {
  item: ShoppingItem;
  onCheck: (checked: boolean) => void;
  onHaveAtHome: (already_have: boolean) => void;
  onEdit: () => void;
  onRemove: () => void;
}

/** One product of the list (G1). Ticked: struck through and faded, in the same place. At home: sage, no strike-through, the house. */
export function ItemRow({ item, onCheck, onHaveAtHome, onEdit, onRemove }: Props) {
  const [open, setOpen] = useState(false);
  const nameId = useId();
  const panelId = useId();
  const temp = isTemp(item);
  const faded = item.checked || item.already_have;

  return (
    <li className={`border-t border-line first:border-t-0 ${item.already_have ? "bg-have" : ""}`}>
      <div className="flex items-start gap-1 py-1">
        <label className="grid size-11 shrink-0 cursor-pointer place-items-center">
          <input type="checkbox" aria-labelledby={nameId} checked={item.checked} onChange={(e) => onCheck(e.target.checked)} className="peer sr-only" />
          <span
            aria-hidden
            className="grid size-[26px] place-items-center rounded-md border-2 border-ink-soft bg-paper text-on-brand peer-checked:border-brand peer-checked:bg-brand peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100"
          >
            <Check className="size-4" strokeWidth={3} />
          </span>
        </label>
        <div className="flex min-w-0 flex-1 flex-col py-2">
          <span id={nameId} className={`flex items-center gap-1.5 break-words font-bold ${faded ? "opacity-70" : ""} ${item.checked ? "line-through" : ""}`}>
            {item.name}
            {item.already_have && <Home role="img" aria-label="Já tenho em casa" className="size-4 shrink-0 text-ink-soft" />}
          </span>
          <span className="text-xs text-ink-soft">{quantityText(item)}</span>
        </div>
        <div className="flex shrink-0 flex-col items-end py-2 text-right">
          {item.expected ? (
            <>
              <span className={`amount font-bold ${faded ? "opacity-70" : ""}`}>{expectedText(item.expected)}</span>
              {item.expected.other_merchant && <span className="text-xs text-ink-soft">{item.expected.merchant_name}</span>}
              <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpen(!open)}
                className="inline-flex min-h-8 items-center gap-0.5 text-sm font-semibold text-brand-deep"
              >
                Ver evolução
                <ChevronDown aria-hidden className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
              </button>
            </>
          ) : (
            <>
              <span className="amount font-bold" aria-label="Sem valor">
                —
              </span>
              <NoInfoStamp />
            </>
          )}
        </div>
        <ActionMenu
          id={`menu-${item.id}`}
          label={`Mais opções de ${item.name}`}
          disabled={temp}
          items={[
            { label: "Editar", icon: <Pencil className="size-4" />, onSelect: onEdit },
            {
              label: item.already_have ? "Voltar a pôr na compra" : "Já tenho em casa",
              hint: item.already_have ? "Volta a contar na estimativa." : "Fica na lista, sem entrar na compra.",
              icon: <Home className="size-4" />,
              onSelect: () => onHaveAtHome(!item.already_have),
            },
            { label: "Excluir da lista", icon: <Trash2 className="size-4" />, danger: true, onSelect: onRemove },
          ]}
        />
      </div>
      {open && item.expected && <PriceEvolution itemId={item.id} panelId={panelId} />}
    </li>
  );
}
