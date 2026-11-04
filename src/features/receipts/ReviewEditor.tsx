import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Pencil, Plus, Scissors, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ApiError, api, unwrap, type Merchant, type Schemas } from "../../api/client";
import { Button, Field, Notice, Select } from "../../components/ui";
import { centsToInput, formatCents, formatQuantity, parseEurToCents } from "../../lib/format";
import { MERCHANT_CHOICES } from "../../lib/merchants";
import { invalidateReceiptData } from "./cache";
import { DeleteReceiptNotice } from "./DeleteReceipt";
import {
  emptyLine,
  lineNet,
  lisbonIso,
  lisbonParts,
  revertField,
  setField,
  splitLine,
  toDraft,
  toPatch,
  validateLine,
  type DraftLine,
  type LineField,
  type PriceField,
} from "./draft";

type Receipt = Schemas["ReceiptOut"];

const FIELD_LABEL: Record<string, string> = {
  description: "descrição",
  quantity: "quantidade",
  unit_price: "preço unitário",
  line_total: "total",
  discount: "desconto",
};

function flaggedFields(line: DraftLine): string[] {
  if (!line.source || line.touched.length) return [];
  return line.source.flags
    .filter((f) => f.startsWith("low_confidence:"))
    .map((f) => f.split(":")[1] ?? "")
    .filter(Boolean);
}

/** Small highlighter mark with a text label: colour is never the only signal. */
function Check_({ what }: { what: string }) {
  return (
    <span className="marker ml-1 inline-flex items-center gap-1 rounded px-1 font-sans text-[0.7rem] font-semibold not-italic">
      <AlertTriangle aria-hidden className="size-3" />
      Verificar {what}
    </span>
  );
}

/** The last price that was corrected, to offer «Desfazer»: the values are as the field shows them. */
interface PriceUndo {
  key: string;
  field: PriceField;
  from: string;
  to: string;
  wasTouched: boolean;
}

export function ReviewEditor({ receipt }: { receipt: Receipt }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [lines, setLines] = useState<DraftLine[]>(() => receipt.lines.map(toDraft));
  const [open, setOpen] = useState<string | null>(null);
  const [merchant, setMerchant] = useState(receipt.merchant ?? "UNKNOWN");
  const [storeName, setStoreName] = useState(receipt.merchant_name ?? "");
  const initial = lisbonParts(receipt.purchase_at);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [printedText, setPrintedText] = useState(centsToInput(receipt.totals.printed_total_cents));
  const [dirty, setDirty] = useState(false);
  const [undo, setUndo] = useState<PriceUndo | null>(null);
  const [deleting, setDeleting] = useState(false);
  const askToDelete = useRef<HTMLButtonElement>(null);
  const wasDeleting = useRef(false);
  // Back from the question (Cancelar), the focus returns to the button that asked it.
  useEffect(() => {
    if (wasDeleting.current && !deleting) askToDelete.current?.focus();
    wasDeleting.current = deleting;
  }, [deleting]);

  const errors = useMemo(() => Object.fromEntries(lines.map((l) => [l.key, validateLine(l)])), [lines]);
  const hasLineErrors = Object.values(errors).some((e) => Object.keys(e).length > 0);
  const recalculated = lines.reduce((sum, l) => sum + (lineNet(l) ?? 0), 0);
  const printed = parseEurToCents(printedText);
  const printedInvalid = printedText.trim() !== "" && printed === null;
  const hasErrors = hasLineErrors || printedInvalid;

  const refresh = (updated: Receipt) => {
    qc.setQueryData(["receipt", receipt.id], updated);
    void invalidateReceiptData(qc);
    void qc.invalidateQueries({ queryKey: ["summary"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      const body: Schemas["ReceiptPatchIn"] = { version: receipt.version, lines: lines.map(toPatch) };
      if (merchant !== receipt.merchant) body.merchant = merchant as Merchant;
      if (storeName.trim() !== (receipt.merchant_name ?? "")) body.merchant_name = storeName.trim();
      const iso = lisbonIso(date, time);
      if (iso && (date !== initial.date || time !== initial.time)) body.purchase_at = iso;
      if (printed !== receipt.totals.printed_total_cents && printed !== null) body.total_cents = printed;
      return unwrap(await api.PATCH("/v1/receipts/{receipt_id}", { params: { path: { receipt_id: receipt.id } }, body }));
    },
    onSuccess: (updated) => {
      setDirty(false);
      setOpen(null);
      setLines(updated.lines.map(toDraft));
      refresh(updated);
    },
  });

  const confirm = useMutation({
    mutationFn: async () => {
      let current = receipt;
      if (dirty) current = await save.mutateAsync();
      return unwrap(
        await api.POST("/v1/receipts/{receipt_id}/confirm", {
          params: { path: { receipt_id: receipt.id } },
          body: { version: current.version },
        }),
      );
    },
    onSuccess: refresh,
  });

  /** «Guardar e rever depois»: what was edited is saved and the person goes back to the list; a failure stays here, with its message. */
  async function saveAndLeave() {
    try {
      if (dirty) await save.mutateAsync();
      navigate("/compras");
    } catch {
      // The message is shown by the error notice below.
    }
  }

  function undoPrice() {
    if (!undo) return;
    update(undo.key, (l) => revertField(l, undo.field, undo.from, undo.wasTouched));
    setUndo(null);
  }

  function update(key: string, change: (l: DraftLine) => DraftLine | DraftLine[] | null) {
    setDirty(true);
    setLines((all) =>
      all.flatMap((l) => {
        if (l.key !== key) return [l];
        const next = change(l);
        return next === null ? [] : Array.isArray(next) ? next : [next];
      }),
    );
  }

  // The line may be gone (removed or split) by the time the bar is read.
  const priceUndo = undo && lines.some((l) => l.key === undo.key) ? undo : null;
  const conflict = [save.error, confirm.error].find((e) => e instanceof ApiError && e.code === "version_conflict");
  const blocking = receipt.review_reasons.filter((r) =>
    ["date_missing", "quantity_pending", "line_total_missing", "no_lines"].includes(r.code ?? ""),
  );

  return (
    <div className="flex flex-col gap-4">
      {receipt.review_reasons.length > 0 && (
        <Notice tone="warning" title="Reveja antes de confirmar">
          <ul className="list-disc pl-5">
            {receipt.review_reasons.map((r, i) => (
              <li key={i}>
                {r.message}
                {r.line_index !== null && r.line_index !== undefined && ` (linha ${r.line_index + 1})`}
                {r.code === "totals_mismatch" && typeof r.details?.difference_cents === "number" && (
                  <> Diferença: {formatCents(r.details.difference_cents as number)}.</>
                )}
              </li>
            ))}
          </ul>
        </Notice>
      )}

      <article className="receipt-paper" aria-label="Nota da compra">
        <div className="flex flex-col gap-3 font-sans text-sm">
          <Select label="Loja" value={merchant} onChange={(e) => (setMerchant(e.target.value), setDirty(true))}>
            {MERCHANT_CHOICES.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </Select>
          {merchant === "UNKNOWN" && (
            <Field
              label="Nome da loja"
              value={storeName}
              maxLength={80}
              hint="Como aparece na nota, por exemplo «Frutaria do Zé»."
              onChange={(e) => (setStoreName(e.target.value), setDirty(true))}
            />
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data" type="date" value={date} onChange={(e) => (setDate(e.target.value), setDirty(true))} />
            <Field label="Hora" type="time" value={time} onChange={(e) => (setTime(e.target.value), setDirty(true))} />
          </div>
        </div>
        <hr />
        <ol className="flex flex-col">
          {lines.map((line, index) => {
            const flagged = flaggedFields(line);
            const src = line.source;
            const pending = src?.flags.includes("quantity_pending") && !line.touched.includes("quantity");
            const unresolved = src?.unresolved && line.touched.length === 0;
            const isOpen = open === line.key;
            return (
              <li key={line.key} className="border-b border-dashed border-line py-2 last:border-0">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`line-${line.key}`}
                  onClick={() => setOpen(isOpen ? null : line.key)}
                  className="flex w-full items-start gap-2 text-left"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex justify-between gap-3">
                      <span className="break-words font-semibold">
                        {line.raw_description || line.product_name || "Produto não identificado"}
                        {flagged.includes("description") && <Check_ what="descrição" />}
                      </span>
                      <span className={flagged.includes("line_total") ? "marker shrink-0" : "shrink-0"}>{line.line_total || "?"}</span>
                    </span>
                    <span className="text-ink-soft">
                      <span className={flagged.includes("quantity") || pending ? "marker" : ""}>
                        {formatQuantity(line.quantity.replace(",", ".") || null, line.unit)}
                      </span>
                      {line.unit_price && (
                        <>
                          {" x "}
                          <span className={flagged.includes("unit_price") ? "marker" : ""}>{line.unit_price}</span>
                        </>
                      )}
                      {line.discount && <> · desconto −{line.discount}</>}
                    </span>
                    {(flagged.length > 0 || pending || unresolved) && (
                      <span className="mt-1">
                        {unresolved && <Check_ what="esta linha" />}
                        {pending && <Check_ what="quantidade" />}
                        {flagged
                          .filter((f) => f !== "description" && f !== "line_total")
                          .map((f) => (
                            <Check_ key={f} what={FIELD_LABEL[f] ?? f} />
                          ))}
                        {flagged.includes("line_total") && <Check_ what="total" />}
                      </span>
                    )}
                    {line.product_name && line.product_name !== line.raw_description && (
                      <span className="font-sans text-xs text-ink-soft">Produto: {line.product_name}</span>
                    )}
                    {line.touched.length > 0 && src && <span className="font-sans text-xs text-brand">Corrigido manualmente</span>}
                    {src?.manually_edited && line.touched.length === 0 && (
                      <span className="font-sans text-xs text-brand">Corrigido manualmente</span>
                    )}
                  </span>
                  <Pencil aria-hidden className="mt-1 size-4 shrink-0 text-ink-soft" />
                  <span className="sr-only">Editar linha {index + 1}</span>
                </button>
                {isOpen && (
                  <LineForm
                    id={`line-${line.key}`}
                    line={line}
                    errors={errors[line.key] ?? {}}
                    onChange={(field, value) => update(line.key, (l) => setField(l, field, value))}
                    onSplit={() => update(line.key, (l) => splitLine(l))}
                    onRemove={() => update(line.key, () => null)}
                    onPriceChange={(field, from, to, wasTouched) => setUndo({ key: line.key, field, from, to, wasTouched })}
                  />
                )}
              </li>
            );
          })}
        </ol>
        <button
          type="button"
          onClick={() => {
            const l = emptyLine();
            setLines((all) => [...all, l]);
            setOpen(l.key);
            setDirty(true);
          }}
          className="mt-2 inline-flex min-h-11 items-center gap-2 font-sans font-semibold text-brand"
        >
          <Plus aria-hidden className="size-4" /> Adicionar linha
        </button>
        <hr />
        <dl className="flex flex-col gap-1">
          <div className="flex justify-between">
            <dt>Soma das linhas</dt>
            <dd>{formatCents(recalculated)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt>
              <label htmlFor="printed-total">Total da nota</label>
            </dt>
            <dd>
              <input
                id="printed-total"
                inputMode="decimal"
                aria-invalid={printedInvalid || undefined}
                className="w-28 rounded border border-line bg-paper px-2 py-1 text-right aria-[invalid=true]:border-alert"
                value={printedText}
                onChange={(e) => {
                  setPrintedText(e.target.value);
                  setDirty(true);
                }}
              />
            </dd>
          </div>
        </dl>
        {printed !== null && printed !== recalculated && (
          <p className="mt-1 text-right font-sans text-xs font-semibold">
            <span className="marker px-1">Diferença de {formatCents(recalculated - printed)}: confirme as linhas ou o total.</span>
          </p>
        )}
      </article>

      {conflict && <Notice tone="error">A compra foi alterada noutro dispositivo. Recarregue a página para ver a versão atual.</Notice>}
      {[save.error, confirm.error]
        .filter((e) => e && e !== conflict)
        .map((e, i) => (
          <Notice key={i} tone="error">
            {e!.message}
          </Notice>
        ))}
      {blocking.length > 0 && !dirty && (
        <p className="text-sm text-ink-soft">Para confirmar falta: {blocking.map((b) => b.message?.toLowerCase()).join(" ")}</p>
      )}

      <div className="sticky bottom-20 z-10 flex flex-col gap-1.5 rounded-surface bg-ground/95 py-3 backdrop-blur md:bottom-0">
        <div role="status" className="absolute inset-x-0 bottom-full mb-2">
          {priceUndo && !deleting && (
            <div className="flex items-center justify-between gap-2 rounded-2xl bg-ink py-1.5 pl-4 pr-1.5 text-[13px] text-ground">
              <span>
                Preço alterado de {priceUndo.from} para {priceUndo.to}
              </span>
              <button type="button" onClick={undoPrice} className="min-h-11 shrink-0 px-3.5 font-extrabold text-[#FFE08A] dark:text-ground dark:underline">
                Desfazer
              </button>
            </div>
          )}
        </div>
        {deleting ? (
          // In the foot, in place of the actions: above it, a sticky foot would cover the question.
          <DeleteReceiptNotice receiptId={receipt.id} onCancel={() => setDeleting(false)} />
        ) : (
          <>
            <p className="text-center text-xs text-ink-soft">Ao confirmar, os valores entram nos seus gastos.</p>
            <Button
              size="lg"
              className="rounded-[28px] font-extrabold"
              busy={confirm.isPending}
              disabled={hasErrors || (!dirty && !receipt.can_confirm)}
              onClick={() => confirm.mutate()}
            >
              Confirmar talão
            </Button>
            <div className="flex flex-wrap justify-between">
              <button
                type="button"
                className="min-h-11 px-2 text-sm font-bold text-ink disabled:cursor-not-allowed disabled:opacity-50"
                disabled={hasErrors || save.isPending}
                aria-busy={save.isPending}
                onClick={() => void saveAndLeave()}
              >
                Guardar e rever depois
              </button>
              <button ref={askToDelete} type="button" className="min-h-11 px-2 text-sm font-extrabold text-alert" onClick={() => setDeleting(true)}>
                Eliminar talão
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function LineForm({
  id,
  line,
  errors,
  onChange,
  onSplit,
  onRemove,
  onPriceChange,
}: {
  id: string;
  line: DraftLine;
  errors: Record<string, string>;
  onChange: (field: LineField, value: string) => void;
  onSplit: () => void;
  onRemove: () => void;
  onPriceChange: (field: PriceField, from: string, to: string, wasTouched: boolean) => void;
}) {
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
  return (
    <div id={id} className="mt-3 flex flex-col gap-3 rounded-control bg-ground p-3 font-sans text-sm">
      {line.source ? (
        <p className="text-xs text-ink-soft">
          Na nota: <span className="font-receipt">{line.source.evidence.join(" / ") || line.source.raw_description}</span>
        </p>
      ) : (
        <Field label="Descrição" value={line.raw_description} error={errors.raw_description} onChange={(e) => onChange("raw_description", e.target.value)} />
      )}
      <Field
        label="Produto"
        hint="Nome usado nas análises. A descrição original da nota é sempre guardada."
        value={line.product_name}
        onChange={(e) => onChange("product", e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantidade" inputMode="decimal" value={line.quantity} error={errors.quantity} onChange={(e) => onChange("quantity", e.target.value)} />
        <Select label="Unidade" value={line.unit} onChange={(e) => onChange("unit", e.target.value)}>
          <option value="un">unidade</option>
          <option value="kg">kg</option>
          <option value="g">g</option>
          <option value="l">l</option>
          <option value="ml">ml</option>
        </Select>
        <Field label="Preço unitário (€)" inputMode="decimal" value={line.unit_price} error={errors.unit_price} onChange={(e) => onChange("unit_price", e.target.value)} {...price("unit_price")} />
        <Field label="Total da linha (€)" inputMode="decimal" value={line.line_total} error={errors.line_total} onChange={(e) => onChange("line_total", e.target.value)} {...price("line_total")} />
        <Field label="Desconto (€)" inputMode="decimal" value={line.discount} error={errors.discount} onChange={(e) => onChange("discount", e.target.value)} />
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
  );
}
