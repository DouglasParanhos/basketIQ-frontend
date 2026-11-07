import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImageIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useBlocker, useNavigate } from "react-router";
import { ApiError, api, unwrap, type Merchant, type Schemas } from "../../api/client";
import { Button, Notice } from "../../components/ui";
import { centsToInput, formatCents, parseEurToCents } from "../../lib/format";
import { receiptChanged } from "./cache";
import { DeleteReceiptNotice } from "./DeleteReceipt";
import { FootQuestion } from "./FootQuestion";
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
  type PriceField,
} from "./draft";
import { flaggedFields, ReviewLines } from "./ReviewLines";
import { ReviewSummary } from "./ReviewSummary";
import { useOriginalViewer } from "./useOriginalViewer";

type Receipt = Schemas["ReceiptOut"];

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
  const [editingKey, setEditingKey] = useState<string | null>(null);
  // How each line was when it was first opened, until «Guardar» or «Cancelar»: «Cancelar» puts it back (null: a line just added, which goes away).
  const [snapshots, setSnapshots] = useState<Record<string, DraftLine | null>>({});
  const [merchant, setMerchant] = useState(receipt.merchant ?? "UNKNOWN");
  const [storeName, setStoreName] = useState(receipt.merchant_name ?? "");
  const initial = lisbonParts(receipt.purchase_at);
  const initialPrinted = centsToInput(receipt.totals.printed_total_cents);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [printedText, setPrintedText] = useState(initialPrinted);
  const [undo, setUndo] = useState<PriceUndo | null>(null);
  const [deleting, setDeleting] = useState(false);
  const original = useOriginalViewer(receipt.id);

  // Anything that differs from the purchase as it was read: worked out, so that «Cancelar» and «Desfazer» can bring it back to nothing.
  const dirty =
    lines.length !== receipt.lines.length ||
    lines.some((l) => !l.id || l.touched.length > 0) ||
    merchant !== (receipt.merchant ?? "UNKNOWN") ||
    storeName.trim() !== (receipt.merchant_name ?? "") ||
    date !== initial.date ||
    time !== initial.time ||
    printedText !== initialPrinted;

  // The screen's own ways out (saved, deleted) navigate with `state.discard`: they are not stopped.
  const blocker = useBlocker(({ nextLocation }) => dirty && !nextLocation.state?.discard);
  const leavingAsked = blocker.state === "blocked";
  // Closing the tab or reloading is not a navigation of the router: the browser asks.
  useEffect(() => {
    if (!dirty) return;
    const ask = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", ask);
    return () => window.removeEventListener("beforeunload", ask);
  }, [dirty]);
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

  const refresh = (updated: Receipt) => void receiptChanged(qc, updated);

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
      setEditingKey(null);
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
      navigate("/compras", { state: { discard: true } });
    } catch {
      // The message is shown by the error notice below.
    }
  }

  function update(key: string, change: (l: DraftLine) => DraftLine | DraftLine[] | null) {
    setLines((all) =>
      all.flatMap((l) => {
        if (l.key !== key) return [l];
        const next = change(l);
        return next === null ? [] : Array.isArray(next) ? next : [next];
      }),
    );
  }

  function undoPrice() {
    if (!undo) return;
    update(undo.key, (l) => revertField(l, undo.field, undo.from, undo.wasTouched));
    setUndo(null);
  }

  const forget = (key: string) => setSnapshots(({ [key]: _gone, ...rest }) => rest);

  function openLine(key: string) {
    setSnapshots((all) => (key in all ? all : { ...all, [key]: lines.find((l) => l.key === key) ?? null }));
    setEditingKey(key);
  }

  function addLine() {
    const l = emptyLine();
    setLines((all) => [...all, l]);
    setSnapshots((all) => ({ ...all, [l.key]: null }));
    setEditingKey(l.key);
  }

  /** «Guardar»: the panel closes and the edits stay. */
  function saveLine() {
    if (editingKey) forget(editingKey);
    setEditingKey(null);
  }

  /** «Cancelar»: the line goes back to how it was when it was first opened, or goes away if it was just added. */
  function cancelLine() {
    if (!editingKey || !(editingKey in snapshots)) return;
    update(editingKey, () => snapshots[editingKey] ?? null);
    if (undo?.key === editingKey) setUndo(null);
    forget(editingKey);
    setEditingKey(null);
  }

  /** Splitting or removing a line is final: there is nothing to go back to. */
  function reshape(key: string, change: (l: DraftLine) => DraftLine | DraftLine[] | null) {
    update(key, change);
    forget(key);
    setEditingKey(null);
  }

  // The line may be gone (removed or split) by the time the bar is read.
  const priceUndo = undo && lines.some((l) => l.key === undo.key) ? undo : null;
  const conflict = [save.error, confirm.error].find((e) => e instanceof ApiError && e.code === "version_conflict");
  const blocking = receipt.review_reasons.filter((r) =>
    ["date_missing", "quantity_pending", "line_total_missing", "no_lines"].includes(r.code ?? ""),
  );

  // The warning says what is still to check: the doubtful values left (the touched ones no longer count) and the sum against the total.
  const doubtful = lines.reduce((n, l) => n + flaggedFields(l).length, 0);
  const mismatch = printed !== null && printed !== recalculated;
  const flagsInLines = lines.some((l) => l.source?.flags.some((f) => f.startsWith("low_confidence:")));
  // What the sentence tells is not repeated (the sum, and the doubtful values of the lines). The others keep the backend's words: the date, the
  // store, no lines, and a doubtful value of the header (store, date, total), which belongs to no line.
  const others = receipt.review_reasons.filter(
    (r) => r.code !== "totals_mismatch" && !(r.code === "low_confidence" && r.line_index !== null && r.line_index !== undefined && flagsInLines),
  );
  const sentence = [
    doubtful > 0 && `Há ${doubtful} ${doubtful === 1 ? "valor que lemos com pouca confiança, marcado" : "valores que lemos com pouca confiança, marcados"} a amarelo.`,
    mismatch && `A soma das linhas (${formatCents(recalculated)}) não coincide com o total do talão (${formatCents(printed)}).`,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-4">
      {receipt.review_reasons.length > 0 && (sentence.length > 0 || others.length > 0) && (
        <Notice tone="warning" title="Reveja antes de confirmar">
          {sentence.length > 0 && <p>{sentence.join(" ")}</p>}
          {others.length > 0 && (
            <ul className="list-disc pl-5">
              {others.map((r, i) => (
                <li key={i}>
                  {r.message}
                  {r.line_index !== null && r.line_index !== undefined && ` (linha ${r.line_index + 1})`}
                </li>
              ))}
            </ul>
          )}
        </Notice>
      )}

      <ReviewSummary
        merchant={merchant}
        onMerchant={setMerchant}
        storeName={storeName}
        onStoreName={setStoreName}
        date={date}
        time={time}
        onDate={setDate}
        onTime={setTime}
        printedText={printedText}
        printed={printed}
        printedInvalid={printedInvalid}
        onPrinted={setPrintedText}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-extrabold">Produtos · {lines.length}</h2>
        {receipt.original_available && (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: receipt.photo_count }, (_, i) => (
              <Button key={i} variant="secondary" size="sm" busy={original.isPending && original.variables === i + 1} onClick={() => original.mutate(i + 1)}>
                <ImageIcon aria-hidden className="size-4" /> {receipt.photo_count > 1 ? `Ver foto ${i + 1}` : "Ver talão original"}
              </Button>
            ))}
          </div>
        )}
      </div>

      <ReviewLines
        lines={lines}
        errors={errors}
        editingKey={editingKey}
        onOpen={openLine}
        onSave={saveLine}
        onCancel={cancelLine}
        onField={(key, field, value) => update(key, (l) => setField(l, field, value))}
        onSplit={(key) => reshape(key, splitLine)}
        onRemove={(key) => reshape(key, () => null)}
        onPriceChange={(key, field, from, to, wasTouched) => setUndo({ key, field, from, to, wasTouched })}
        onAdd={addLine}
      />

      {conflict && <Notice tone="error">A compra foi alterada noutro dispositivo. Recarregue a página para ver a versão atual.</Notice>}
      {[save.error, confirm.error, original.error]
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
          {priceUndo && !deleting && !leavingAsked && (
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
        {leavingAsked ? (
          // The questions of the foot take the place of the actions: above it, a sticky foot would cover them.
          <LeaveNotice onLeave={() => blocker.proceed()} onStay={() => blocker.reset()} />
        ) : deleting ? (
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

/** The question when the person tries to leave with edits that were not saved. */
function LeaveNotice({ onLeave, onStay }: { onLeave: () => void; onStay: () => void }) {
  return (
    <FootQuestion>
      <Notice
        tone="warning"
        title="Sair sem guardar as alterações?"
        action={
          <>
            <Button variant="danger" onClick={onLeave}>
              Sair sem guardar
            </Button>
            <Button variant="quiet" onClick={onStay}>
              Continuar a editar
            </Button>
          </>
        }
      >
        As alterações feitas neste talão perdem-se se sair agora.
      </Notice>
    </FootQuestion>
  );
}
