import { ChevronDown } from "lucide-react";
import { useId, useRef, useState } from "react";
import type { Merchant } from "../../api/client";
import { MarketTile } from "../../components/MarketBadge";
import { formatCents, plural } from "../../lib/format";
import { merchantName } from "../../lib/merchants";
import type { ShoppingList } from "./useShoppingList";

type Estimate = ShoppingList["estimates"][number];

const estimateText = (e: Estimate) => (e.items_with_price === 0 ? "—" : formatCents(e.total_cents));
const otherText = (e: Estimate) =>
  e.other_merchant_values > 0 ? plural(e.other_merchant_values, "valor de outro supermercado", "valores de outros supermercados") : null;

/** The field «Supermercado» (name and estimate): it opens the choice among all the supermarkets, each with its estimate. */
export function SupermarketPicker({ list, onChoose }: { list: ShoppingList; onChoose: (merchant: Merchant) => void }) {
  const [open, setOpen] = useState(false);
  const field = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const name = useId();
  const current = list.estimates.find((e) => e.merchant === list.merchant) ?? list.estimates[0];
  if (!current) return null;

  return (
    <div>
      <button
        ref={field}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-surface bg-paper p-3 text-left ring-1 ring-inset ring-line"
      >
        <MarketTile code={current.merchant} size={44} fontSize={20} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-xs text-ink-soft">Supermercado</span>
          <span className="truncate text-lg font-extrabold">{current.merchant_name}</span>
        </span>
        <span className="flex flex-col items-end">
          <span className="text-xs text-ink-soft">Estimativa</span>
          <span className="amount text-xl font-extrabold">{estimateText(current)}</span>
        </span>
        <ChevronDown aria-hidden className={`size-5 shrink-0 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {otherText(current) && <p className="mt-1 px-1 text-xs text-ink-soft">{otherText(current)}</p>}
      {open && (
        <fieldset id={panelId} className="mt-2 rounded-surface bg-paper p-1 ring-1 ring-inset ring-line">
          <legend className="sr-only">Supermercado</legend>
          {list.estimates.map((e) => (
            <label key={e.merchant} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-control px-3 py-2 has-[:checked]:bg-brand-soft has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-brand">
              <input
                type="radio"
                name={name}
                checked={e.merchant === list.merchant}
                onChange={() => {
                  onChoose(e.merchant as Merchant);
                  setOpen(false);
                  field.current?.focus();
                }}
                className="sr-only"
              />
              <MarketTile code={e.merchant} size={36} fontSize={16} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-bold">{merchantName(e.merchant, e.merchant_name)}</span>
                {otherText(e) && <span className="text-xs text-ink-soft">{otherText(e)}</span>}
              </span>
              <span className="amount font-bold">{estimateText(e)}</span>
            </label>
          ))}
        </fieldset>
      )}
    </div>
  );
}
