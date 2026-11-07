import { AlertTriangle, Info, MoreHorizontal, Pencil, Plus, Scissors, Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { BottomSheet } from "../../components/BottomSheet";
import { Button, Field, Select } from "../../components/ui";
import { centsToInput, formatAmount, formatQuantity, parseEurToCents } from "../../lib/format";
import { totalDisagrees, type DraftLine, type LineErrors, type LineField, type PriceField } from "./draft";
import { FootQuestion } from "./FootQuestion";

/** The lines that show before «Ver os outros N produtos»: the rest only hides when nothing in it asks for attention. */
const SHOWN = 5;

const FIELD_LABEL = {
  description: "descrição",
  quantity: "quantidade",
  unit: "unidade",
  unit_price: "preço unitário",
  line_total: "total",
  discount: "desconto",
} as const;
/** The values asked for under a line («Verificar …»), in this order; the description is asked for next to the name. */
const CHECK_ORDER = ["quantity", "unit", "unit_price", "discount", "line_total"] as const;

/** The values of a line that were read with little confidence and that the person has not touched yet. */
export function flaggedFields(line: DraftLine): string[] {
  if (!line.source || line.touched.length) return [];
  return line.source.flags
    .filter((f) => f.startsWith("low_confidence:"))
    .map((f) => f.split(":")[1] ?? "")
    .filter(Boolean);
}

/** A quantity that the reading left pending, until the person touches it. */
const quantityPending = (line: DraftLine) => !!line.source?.flags.includes("quantity_pending") && !line.touched.includes("quantity");

/** A line no rule understood, until the person touches it. */
const unresolvedLine = (line: DraftLine) => !!line.source?.unresolved && line.touched.length === 0;

/** Small highlighter mark with a text label: colour is never the only signal. */
function Check_({ label }: { label: string }) {
  return (
    <span className="marker ml-1 inline-flex items-center gap-1 rounded px-1 text-[0.7rem] font-semibold not-italic">
      <AlertTriangle aria-hidden className="size-3" />
      {label}
    </span>
  );
}

const nameOf = (line: DraftLine) => line.raw_description || line.product_name || "Produto não identificado";

/** A line that must stay in sight: doubtful, touched, new, unidentified or with an invalid value. */
function asksForAttention(line: DraftLine, errors: LineErrors | undefined) {
  return flaggedFields(line).length > 0 || line.touched.length > 0 || !line.id || !!line.source?.unresolved || Object.keys(errors ?? {}).length > 0;
}

interface Props {
  lines: DraftLine[];
  errors: Record<string, LineErrors>;
  editingKey: string | null;
  onOpen: (key: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onField: (key: string, field: LineField, value: string) => void;
  onSplit: (key: string) => void;
  onRemove: (key: string) => void;
  onPriceChange: (key: string, change: PriceChange) => void;
  onAdd: () => void;
}

export function ReviewLines(p: Props) {
  const [expanded, setExpanded] = useState(false);
  const foldable = (l: DraftLine, i: number) => i >= SHOWN && l.key !== p.editingKey && !asksForAttention(l, p.errors[l.key]);
  const collapsible = p.lines.filter(foldable).length;
  const shown = expanded ? p.lines : p.lines.filter((l, i) => !foldable(l, i));

  return (
    <>
      <ul aria-label="Produtos" className="overflow-hidden rounded-surface bg-paper px-4 ring-1 ring-inset ring-line">
        {shown.map((line) =>
          line.key === p.editingKey ? (
            <LinePanel
              key={line.key}
              line={line}
              errors={p.errors[line.key] ?? {}}
              onField={(field, value) => p.onField(line.key, field, value)}
              onSave={p.onSave}
              onCancel={p.onCancel}
              onSplit={() => p.onSplit(line.key)}
              onRemove={() => p.onRemove(line.key)}
              onPriceChange={(change) => p.onPriceChange(line.key, change)}
            />
          ) : (
            <LineRow key={line.key} line={line} onOpen={() => p.onOpen(line.key)} />
          ),
        )}
        {collapsible > 0 && (
          <li className="border-t border-line">
            <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="flex min-h-12 w-full items-center text-sm font-extrabold text-brand">
              {expanded ? "Ver menos produtos" : `Ver os outros ${collapsible} ${collapsible === 1 ? "produto" : "produtos"}`}
            </button>
          </li>
        )}
      </ul>
      <button type="button" onClick={p.onAdd} className="inline-flex min-h-11 items-center gap-2 self-start font-semibold text-brand">
        <Plus aria-hidden className="size-4" /> Adicionar linha
      </button>
    </>
  );
}

function LineRow({ line, onOpen }: { line: DraftLine; onOpen: () => void }) {
  const flagged = flaggedFields(line);
  const pending = quantityPending(line);
  const unresolved = unresolvedLine(line);
  const name = nameOf(line);
  // A line no rule understood is checked as a whole: its values were never read, so each is not asked for apart.
  const checks = unresolved ? ["esta linha"] : CHECK_ORDER.filter((f) => flagged.includes(f) || (f === "quantity" && pending)).map((f) => FIELD_LABEL[f]);
  return (
    <li className="flex min-h-14 items-center gap-2.5 border-t border-line py-1.5 first:border-t-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="break-words text-sm font-bold">
          {name}
          {flagged.includes("description") && !unresolved && <Check_ label="Verificar descrição" />}
        </span>
        {!unresolved && (
          <span className="text-xs text-ink-soft">
            <span className={flagged.includes("quantity") || pending ? "marker" : ""}>{formatQuantity(line.quantity.replace(",", ".") || null, line.unit)}</span>
            {line.unit_price && (
              <>
                {" × "}
                <span className={flagged.includes("unit_price") ? "marker" : ""}>{line.unit_price}</span>
              </>
            )}
            {line.discount && <> · desconto −{line.discount}</>}
          </span>
        )}
        {checks.length > 0 && (
          <span className="mt-1">
            {checks.map((what) => (
              <Check_ key={what} label={`Verificar ${what}`} />
            ))}
          </span>
        )}
        {line.product_name && line.product_name !== line.raw_description && <span className="text-xs text-ink-soft">Produto: {line.product_name}</span>}
        {line.source && (line.touched.length > 0 || line.source.manually_edited) && <span className="text-xs text-brand">Corrigido manualmente</span>}
      </div>
      <span className={flagged.includes("line_total") ? "marker shrink-0 px-0.5 font-extrabold" : "shrink-0 font-bold"}>{line.line_total || "?"}</span>
      <button type="button" aria-label={`Editar ${name}`} onClick={onOpen} className="grid size-11 shrink-0 place-items-center text-ink-soft">
        <Pencil aria-hidden className="size-[18px]" />
      </button>
    </li>
  );
}

/** How a price was before it was corrected, to put it back. */
interface PriceSide {
  field: PriceField;
  from: string;
  wasTouched: boolean;
}

/** A price that was corrected (first side) and the one tied to it, which moved with it (second), to offer «Desfazer»: the values are as the fields show them. */
export interface PriceChange {
  to: string;
  sides: [PriceSide, PriceSide];
}

interface PanelProps {
  line: DraftLine;
  errors: LineErrors;
  onField: (field: LineField, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onSplit: () => void;
  onRemove: () => void;
  onPriceChange: (change: PriceChange) => void;
}

const tiedTo = (field: PriceField): PriceField => (field === "line_total" ? "unit_price" : "line_total");

/** The line being edited: all it takes to correct it, always in sight; what is read from the note is behind ⓘ, the rare actions behind ⋯. */
function LinePanel({ line, errors, onField, onSave, onCancel, onSplit, onRemove, onPriceChange }: PanelProps) {
  const [info, setInfo] = useState(false);
  const [menu, setMenu] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [discount, setDiscount] = useState(line.discount !== "");
  const actionsId = useId();
  const root = useRef<HTMLLIElement>(null);
  const menuBox = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  // A price counts as corrected when the person leaves the field with another valid value than the one it had on entering.
  const focused = useRef<{ field: PriceField; line: DraftLine } | null>(null);
  const price = (field: PriceField) => ({
    onFocus: () => {
      focused.current = { field, line };
    },
    onBlur: () => {
      const before = focused.current;
      focused.current = null;
      if (before?.field !== field) return;
      const from = parseEurToCents(before.line[field]);
      const to = parseEurToCents(line[field]);
      if (from === null || to === null || from === to) return;
      const side = (f: PriceField): PriceSide => ({ field: f, from: before.line[f], wasTouched: before.line.touched.includes(f) });
      onPriceChange({ to: centsToInput(to), sides: [{ ...side(field), from: centsToInput(from) }, side(tiedTo(field))] });
    },
  });

  // The card comes into view when it opens.
  useEffect(() => {
    root.current?.scrollIntoView?.({ block: "nearest" });
  }, []);
  useEffect(() => {
    if (!menu) return;
    const away = (e: PointerEvent) => {
      if (!(e.target instanceof Node) || !menuBox.current?.contains(e.target)) setMenu(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenu(false);
      menuButton.current?.focus();
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [menu]);

  const src = line.source;
  const flagged = flaggedFields(line);
  // The mark that asks to check a field against the receipt: it is the only help the card shows by default.
  const ask = (field: string, extra = false) => (flagged.includes(field) || extra) && <Check_ label="Confira" />;
  // The person may have emptied the name: a read line shows the original only until the name is touched.
  const nameValue = src ? (line.touched.includes("product") ? line.product_name : line.product_name || line.raw_description) : line.raw_description;

  return (
    <li ref={root} className="-mx-4 scroll-mb-4 border-t border-line bg-warn-soft/40 px-4 py-3 first:border-t-0">
      <div className="flex items-end gap-1">
        <Field
          label="Produto"
          className="min-w-0 flex-1"
          value={nameValue}
          error={errors.raw_description}
          note={ask("description", unresolvedLine(line))}
          onChange={(e) => onField(src ? "product" : "raw_description", e.target.value)}
        />
        {src && (
          <button type="button" aria-label="Saber mais sobre esta linha" onClick={() => setInfo(true)} className="grid size-11 shrink-0 place-items-center text-ink-soft">
            <Info aria-hidden className="size-5" />
          </button>
        )}
        <div ref={menuBox} className="relative shrink-0">
          <button
            ref={menuButton}
            type="button"
            aria-label="Mais ações da linha"
            aria-expanded={menu}
            aria-controls={actionsId}
            onClick={() => setMenu(!menu)}
            className="grid size-11 place-items-center text-ink-soft"
          >
            <MoreHorizontal aria-hidden className="size-5" />
          </button>
          {menu && (
            <ul id={actionsId} className="absolute right-0 top-full z-10 mt-1 w-48 rounded-surface bg-paper p-1 shadow-lg ring-1 ring-line">
              <li>
                <button type="button" onClick={onSplit} className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm font-bold">
                  <Scissors aria-hidden className="size-4" /> Dividir linha
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setMenu(false);
                    setRemoving(true);
                  }}
                  className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm font-bold text-alert"
                >
                  <Trash2 aria-hidden className="size-4" /> Remover linha
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 items-end gap-x-2 gap-y-2">
        <Field
          label="Quantidade"
          inputMode="decimal"
          value={line.quantity}
          error={errors.quantity}
          note={ask("quantity", quantityPending(line))}
          onChange={(e) => onField("quantity", e.target.value)}
        />
        <Select label="Unidade" value={line.unit} onChange={(e) => onField("unit", e.target.value)}>
          <option value="un">unidade</option>
          <option value="kg">kg</option>
          <option value="g">g</option>
          <option value="l">l</option>
          <option value="ml">ml</option>
        </Select>
        <Field
          label="Preço unitário (€)"
          inputMode="decimal"
          value={line.unit_price}
          error={errors.unit_price}
          note={ask("unit_price")}
          onChange={(e) => onField("unit_price", e.target.value)}
          {...price("unit_price")}
        />
        <Field
          label="Preço total (€)"
          inputMode="decimal"
          value={line.line_total}
          error={errors.line_total}
          note={ask("line_total", totalDisagrees(line))}
          onChange={(e) => onField("line_total", e.target.value)}
          {...price("line_total")}
        />
        {discount ? (
          <Field
            label="Desconto (€)"
            inputMode="decimal"
            value={line.discount}
            error={errors.discount}
            note={ask("discount")}
            onChange={(e) => onField("discount", e.target.value)}
          />
        ) : (
          <button type="button" onClick={() => setDiscount(true)} className="col-span-2 flex min-h-11 items-center self-start text-[13px] font-bold text-brand">
            + Desconto
          </button>
        )}
      </div>

      {removing ? (
        <div className="mt-3">
          <FootQuestion>
            <p className="text-sm font-bold">Remover esta linha?</p>
            <div className="flex gap-2">
              <Button type="button" variant="danger" className="flex-1" onClick={onRemove}>
                Remover
              </Button>
              <Button type="button" variant="outline" className="flex-1" onClick={() => setRemoving(false)}>
                Manter
              </Button>
            </div>
          </FootQuestion>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <Button type="button" className="flex-1" disabled={Object.keys(errors).length > 0} onClick={onSave}>
            Guardar
          </Button>
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      )}

      {info && src && (
        <BottomSheet title="Sobre esta linha" onClose={() => setInfo(false)}>
          <div>
            <p className="text-xs text-ink-soft">Na nota</p>
            <p className="font-receipt text-sm">{src.evidence.join(" / ") || src.raw_description}</p>
          </div>
          {src.line_total_cents !== null && <p className="text-sm">Lido: {formatAmount(src.line_total_cents)}</p>}
          <p className="text-sm text-ink-soft">O nome que editar é o usado nas análises. O original da nota fica sempre guardado.</p>
        </BottomSheet>
      )}
    </li>
  );
}
