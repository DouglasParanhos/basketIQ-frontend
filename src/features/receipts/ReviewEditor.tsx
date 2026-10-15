import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, Pencil, Plus, Scissors, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { ApiError, api, unwrap, type Merchant, type Schemas } from "../../api/client";
import { Button, Field, Notice, Select } from "../../components/ui";
import { centsToInput, formatCents, formatQuantity, MERCHANT_NAMES, parseEurToCents } from "../../lib/format";
import {
  emptyLine,
  lineNet,
  lisbonIso,
  lisbonParts,
  setField,
  splitLine,
  toDraft,
  toPatch,
  validateLine,
  type DraftLine,
  type LineField,
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

export function ReviewEditor({ receipt }: { receipt: Receipt }) {
  const qc = useQueryClient();
  const [lines, setLines] = useState<DraftLine[]>(() => receipt.lines.map(toDraft));
  const [open, setOpen] = useState<string | null>(null);
  const [merchant, setMerchant] = useState(receipt.merchant && receipt.merchant !== "UNKNOWN" ? receipt.merchant : "");
  const initial = lisbonParts(receipt.purchase_at);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [printedText, setPrintedText] = useState(centsToInput(receipt.totals.printed_total_cents));
  const [dirty, setDirty] = useState(false);

  const errors = useMemo(() => Object.fromEntries(lines.map((l) => [l.key, validateLine(l)])), [lines]);
  const hasLineErrors = Object.values(errors).some((e) => Object.keys(e).length > 0);
  const recalculated = lines.reduce((sum, l) => sum + (lineNet(l) ?? 0), 0);
  const printed = parseEurToCents(printedText);
  const printedInvalid = printedText.trim() !== "" && printed === null;
  const hasErrors = hasLineErrors || printedInvalid;

  const refresh = (updated: Receipt) => {
    qc.setQueryData(["receipt", receipt.id], updated);
    void qc.invalidateQueries({ queryKey: ["receipts"] });
    void qc.invalidateQueries({ queryKey: ["summary"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      const body: Schemas["ReceiptPatchIn"] = { version: receipt.version, lines: lines.map(toPatch) };
      if (merchant && merchant !== receipt.merchant) body.merchant = merchant as Merchant;
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

  const conflict = [save.error, confirm.error].find((e) => e instanceof ApiError && e.code === "version_conflict");
  const blocking = receipt.review_reasons.filter((r) =>
    ["merchant_unknown", "date_missing", "quantity_pending", "line_total_missing", "no_lines"].includes(r.code ?? ""),
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
          <Select label="Supermercado" value={merchant} onChange={(e) => (setMerchant(e.target.value), setDirty(true))}>
            {!merchant && <option value="">Escolha o supermercado</option>}
            {Object.entries(MERCHANT_NAMES)
              .filter(([code]) => code !== "UNKNOWN")
              .map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
          </Select>
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
                    {line.touched.length > 0 && src && <span className="font-sans text-xs text-cobalt">Corrigido manualmente</span>}
                    {src?.manually_edited && line.touched.length === 0 && (
                      <span className="font-sans text-xs text-cobalt">Corrigido manualmente</span>
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
          className="mt-2 inline-flex min-h-11 items-center gap-2 font-sans font-semibold text-cobalt"
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

      <div className="sticky bottom-20 z-10 flex gap-3 rounded-surface bg-ground/95 py-3 backdrop-blur md:bottom-0">
        <Button variant="secondary" className="flex-1" busy={save.isPending} disabled={!dirty || hasErrors} onClick={() => save.mutate()}>
          Guardar
        </Button>
        <Button
          className="flex-1"
          busy={confirm.isPending}
          disabled={hasErrors || (!dirty && !receipt.can_confirm)}
          onClick={() => confirm.mutate()}
        >
          <Check aria-hidden className="size-5" /> Confirmar
        </Button>
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
}: {
  id: string;
  line: DraftLine;
  errors: Record<string, string>;
  onChange: (field: LineField, value: string) => void;
  onSplit: () => void;
  onRemove: () => void;
}) {
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
        <Field label="Preço unitário (€)" inputMode="decimal" value={line.unit_price} error={errors.unit_price} onChange={(e) => onChange("unit_price", e.target.value)} />
        <Field label="Total da linha (€)" inputMode="decimal" value={line.line_total} error={errors.line_total} onChange={(e) => onChange("line_total", e.target.value)} />
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
