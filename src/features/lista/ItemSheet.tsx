import { Plus } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { ModalSheet } from "../../components/ModalSheet";
import { Button, Field, Select } from "../../components/ui";
import { parseQuantity, quantityToInput } from "../../lib/format";
import { useAnnounce } from "../../components/Announce";
import type { Schemas } from "../../api/client";
import { useSuggestions, type ShoppingItem, type ShoppingList } from "./useShoppingList";

const UNITS = ["un", "kg", "g", "l", "ml"] as const;

interface AddProps {
  onClose: () => void;
  onAdd: (item: { name: string; already_have: boolean; product_id?: string }) => void;
}

/** G5: add products. The sheet stays open to add several; the suggestions of the next purchase are one tap each. */
export function AddSheet({ onClose, onAdd }: AddProps) {
  const announce = useAnnounce();
  const suggestions = useSuggestions();
  const [name, setName] = useState("");
  const [haveAtHome, setHaveAtHome] = useState(false);
  const [taken, setTaken] = useState<Set<string>>(new Set());
  const field = useRef<HTMLInputElement>(null);
  const shown = (suggestions.data ?? []).filter((s) => !taken.has(s.product_id));

  function submit(e: FormEvent) {
    e.preventDefault();
    const value = name.trim();
    if (!value) return;
    onAdd({ name: value, already_have: haveAtHome });
    announce(`${value} adicionado à lista.`);
    setName("");
    field.current?.focus();
  }

  return (
    <ModalSheet title="Adicionar à lista" onClose={onClose}>
      <form onSubmit={submit} className="flex items-end gap-2">
        <Field ref={field} label="Produto" placeholder="Escrever um produto" value={name} onChange={(e) => setName(e.target.value)} className="flex-1" data-autofocus="" autoComplete="off" />
        <Button type="submit" size="lg" disabled={!name.trim()}>
          Adicionar
        </Button>
      </form>
      {shown.length > 0 && (
        <section aria-labelledby="next-purchase">
          <h3 id="next-purchase" className="text-xs font-semibold uppercase tracking-widest text-ink-soft">
            Para a próxima compra
          </h3>
          <p className="mb-2 text-sm text-ink-soft">Produtos que costuma comprar por esta altura.</p>
          <ul className="flex flex-wrap gap-2">
            {shown.map((s) => (
              <li key={s.product_id}>
                <button
                  type="button"
                  onClick={() => {
                    onAdd({ name: s.name, already_have: haveAtHome, product_id: s.product_id });
                    announce(`${s.name} adicionado à lista.`);
                    setTaken(new Set([...taken, s.product_id]));
                  }}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-paper px-4 font-semibold ring-1 ring-inset ring-line"
                >
                  <Plus aria-hidden className="size-4 text-brand" strokeWidth={3} />
                  {s.name}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <label className="flex min-h-11 cursor-pointer items-center gap-3">
        <input type="checkbox" checked={haveAtHome} onChange={(e) => setHaveAtHome(e.target.checked)} className="size-6 accent-[var(--color-brand)]" />
        <span className="font-semibold">Já tenho em casa</span>
      </label>
      <Button variant="secondary" size="lg" onClick={onClose}>
        Concluído
      </Button>
    </ModalSheet>
  );
}

interface EditProps {
  item: ShoppingItem;
  categories: ShoppingList["categories"];
  onClose: () => void;
  onSave: (changes: Schemas["ShoppingItemPatch"]) => void;
}

/** «Editar» in the menu of an item: its name, quantity, unit and category. */
export function EditSheet({ item, categories, onClose, onSave }: EditProps) {
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(quantityToInput(item.quantity));
  const [unit, setUnit] = useState(item.unit ?? "");
  const [category, setCategory] = useState(item.category);
  const amount = parseQuantity(quantity);
  const invalid = !name.trim() || amount === null;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (invalid || amount === null) return;
    onSave({ name: name.trim(), quantity: amount, unit: UNITS.find((u) => u === unit) ?? null, category });
    onClose();
  }

  return (
    <ModalSheet title="Editar produto" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="Produto" value={name} onChange={(e) => setName(e.target.value)} data-autofocus="" autoComplete="off" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantidade" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} error={amount === null ? "Indique uma quantidade." : null} />
          <Select label="Unidade" value={unit} onChange={(e) => setUnit(e.target.value)}>
            <option value="">Sem unidade</option>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u === "un" ? "un." : u}
              </option>
            ))}
          </Select>
        </div>
        <Select label="Categoria" value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <div className="mt-1 flex gap-2">
          <Button type="submit" size="lg" className="flex-1" aria-disabled={invalid ? true : undefined}>
            Guardar
          </Button>
          <Button type="button" variant="secondary" size="lg" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </ModalSheet>
  );
}
