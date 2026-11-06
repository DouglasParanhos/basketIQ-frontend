import { AlertTriangle, Pencil, Plus, Scissors, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button, Field, Select } from "../../components/ui";
import { centsToInput, formatAmount, formatQuantity, parseEurToCents } from "../../lib/format";
import type { DraftLine, LineErrors, LineField, PriceField } from "./draft";

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

/** Small highlighter mark with a text label: colour is never the only signal. */
function Check_({ what }: { what: string }) {
  return (
    <span className="marker ml-1 inline-flex items-center gap-1 rounded px-1 text-[0.7rem] font-semibold not-italic">
      <AlertTriangle aria-hidden className="size-3" />
      Verificar {what}
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
  onPriceChange: (key: string, field: PriceField, from: string, to: string, wasTouched: boolean) => void;
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
              onPriceChange={(field, from, to, wasTouched) => p.onPriceChange(line.key, field, from, to, wasTouched)}
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
  const src = line.source;
  const pending = src?.flags.includes("quantity_pending") && !line.touched.includes("quantity");
  const unresolved = src?.unresolved && line.touched.length === 0;
  const name = nameOf(line);
  // A line no rule understood is checked as a whole: its values were never read, so each is not asked for apart.
  const checks = unresolved ? ["esta linha"] : CHECK_ORDER.filter((f) => flagged.includes(f) || (f === "quantity" && pending)).map((f) => FIELD_LABEL[f]);
  return (
    <li className="flex min-h-14 items-center gap-2.5 border-t border-line py-1.5 first:border-t-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="break-words text-sm font-bold">
          {name}
          {flagged.includes("description") && !unresolved && <Check_ what="descrição" />}
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
              <Check_ key={what} what={what} />
            ))}
          </span>
        )}
        {line.product_name && line.product_name !== line.raw_description && <span className="text-xs text-ink-soft">Produto: {line.product_name}</span>}
        {src && (line.touched.length > 0 || src.manually_edited) && <span className="text-xs text-brand">Corrigido manualmente</span>}
      </div>
      <span className={flagged.includes("line_total") ? "marker shrink-0 px-0.5 font-extrabold" : "shrink-0 font-bold"}>{line.line_total || "?"}</span>
      <button type="button" aria-label={`Editar ${name}`} onClick={onOpen} className="grid size-11 shrink-0 place-items-center text-ink-soft">
        <Pencil aria-hidden className="size-[18px]" />
      </button>
    </li>
  );
}

interface PanelProps {
  line: DraftLine;
  errors: LineErrors;
  onField: (field: LineField, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onSplit: () => void;
  onRemove: () => void;
  onPriceChange: (field: PriceField, from: string, to: string, wasTouched: boolean) => void;
}

/** The line being edited: its two figures first, the read value to check them against, and the rest under «Mais opções». */
function LinePanel({ line, errors, onField, onSave, onCancel, onSplit, onRemove, onPriceChange }: PanelProps) {
  const [more, setMore] = useState(false);
  // A price counts as corrected when the person leaves the field with another valid value than the one it had on entering.
  const focused = useRef<{ field: PriceField; value: string; wasTouched: boolean } | null>(null);
  const price = (field: PriceField) => ({
    onFocus: () => {
      focused.current = { field, value: line[field], wasTouched: line.touched.includes(field) };
    },
    onBlur: () => {
      const before = focused.current;
      focused.current = null;
      if (before?.field !== field) return;
      const from = parseEurToCents(before.value);
      const to = parseEurToCents(line[field]);
      if (from !== null && to !== null && from !== to) onPriceChange(field, centsToInput(from), centsToInput(to), before.wasTouched);
    },
  });
  const read = line.source?.line_total_cents;
  const id = `line-${line.key}`;
  return (
    <li id={id} className="-mx-4 border-t border-line bg-warn-soft/40 px-4 py-3 first:border-t-0">
      <div className="flex items-center justify-between gap-3">
        <span className="break-words text-sm font-extrabold">{nameOf(line)}</span>
        <span className="shrink-0 text-[11px] font-extrabold text-warn-ink">a editar</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {!line.source && (
          <Field label="Descrição" className="col-span-2" value={line.raw_description} error={errors.raw_description} onChange={(e) => onField("raw_description", e.target.value)} />
        )}
        <Field label="Quantidade" inputMode="decimal" value={line.quantity} error={errors.quantity} onChange={(e) => onField("quantity", e.target.value)} />
        <Field label="Preço total (€)" inputMode="decimal" value={line.line_total} error={errors.line_total} onChange={(e) => onField("line_total", e.target.value)} {...price("line_total")} />
      </div>
      {read !== null && read !== undefined && <p className="mt-2 text-xs text-ink-soft">Lido: {formatAmount(read)}. Confira com o talão original.</p>}

      <button type="button" aria-expanded={more} aria-controls={`${id}-more`} onClick={() => setMore(!more)} className="mt-1 flex min-h-11 items-center text-[13px] font-bold text-brand">
        Mais opções
      </button>
      {more && (
        <div id={`${id}-more`} className="flex flex-col gap-3">
          {line.source && (
            <p className="text-xs text-ink-soft">
              Na nota: <span className="font-receipt">{line.source.evidence.join(" / ") || line.source.raw_description}</span>
            </p>
          )}
          {line.source && (
            <Field label="Produto" hint="Nome usado nas análises. A descrição original da nota é sempre guardada." value={line.product_name} onChange={(e) => onField("product", e.target.value)} />
          )}
          <div className="grid grid-cols-2 gap-2">
            <Select label="Unidade" value={line.unit} onChange={(e) => onField("unit", e.target.value)}>
              <option value="un">unidade</option>
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="l">l</option>
              <option value="ml">ml</option>
            </Select>
            <Field label="Preço unitário (€)" inputMode="decimal" value={line.unit_price} error={errors.unit_price} onChange={(e) => onField("unit_price", e.target.value)} {...price("unit_price")} />
            <Field label="Desconto (€)" inputMode="decimal" value={line.discount} error={errors.discount} onChange={(e) => onField("discount", e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={onSplit}>
              <Scissors aria-hidden className="size-4" /> Dividir linha
            </Button>
            <Button type="button" variant="quiet" onClick={onRemove}>
              <Trash2 aria-hidden className="size-4" /> Remover linha
            </Button>
          </div>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <Button type="button" className="flex-1" disabled={Object.keys(errors).length > 0} onClick={onSave}>
          Guardar
        </Button>
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </li>
  );
}
