import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Home, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ApiError, api, unwrap, type Schemas } from "../../api/client";
import { Button, ErrorNotice, LinkButton, Notice, Select, Spinner, StatusBadge } from "../../components/ui";
import { formatAmount, formatCents, formatDate, formatDateTime, formatQuantity, plural } from "../../lib/format";
import { MERCHANT_OPTIONS, merchantName } from "../../lib/merchants";
import { EDITABLE, IN_PROGRESS } from "../../lib/status";
import { invalidateReceiptData, receiptChanged } from "./cache";
import { PriceCheck } from "../groups/PriceCheck";
import { DeleteReceiptNotice, useDeleteReceipt } from "./DeleteReceipt";
import { FootQuestion } from "./FootQuestion";
import { ReviewEditor } from "./ReviewEditor";
import { useOriginalViewer } from "./useOriginalViewer";

type Receipt = Schemas["ReceiptOut"];

export function ReceiptPage() {
  const { id = "" } = useParams();
  const query = useQuery({
    queryKey: ["receipt", id],
    queryFn: async () => unwrap(await api.GET("/v1/receipts/{receipt_id}", { params: { path: { receipt_id: id } } })),
    refetchInterval: (q) => (q.state.data && IN_PROGRESS.has(q.state.data.status) ? 2000 : false),
    // Processing is short: keep checking even if the tab is in the background.
    refetchIntervalInBackground: true,
  });

  if (query.isLoading) return <Spinner />;
  if (query.error) {
    return (
      <div className="pt-6">
        {query.error instanceof ApiError && query.error.status === 404 ? (
          <Notice tone="error" title="Compra não encontrada">
            {query.error.message}
          </Notice>
        ) : (
          <ErrorNotice what="carregar a compra" error={query.error} onRetry={() => void query.refetch()} />
        )}
      </div>
    );
  }
  const r = query.data!;
  return (
    <>
      <header className="flex items-center gap-3 pb-4 pt-6">
        <Link to="/compras" aria-label="Voltar às compras" className="grid size-11 place-items-center rounded-full hover:bg-brand-soft">
          <ArrowLeft aria-hidden className="size-5" />
        </Link>
        {inReview(r) ? (
          // The store and the date are in the summary card below; the warning says what is left to check.
          <>
            <h1 className="min-w-0 flex-1 truncate text-center font-display text-xl font-semibold">Rever talão</h1>
            <span aria-hidden className="size-11 shrink-0" />
          </>
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-2xl font-semibold">{r.merchant_name || (r.merchant && r.merchant !== "UNKNOWN") ? merchantName(r.merchant, r.merchant_name) : "Nova compra"}</h1>
              {r.store_label && <p className="truncate text-sm font-semibold text-ink-soft">{r.store_label}</p>}
              <p className="text-sm text-ink-soft">{r.purchase_at ? formatDateTime(r.purchase_at) : `Enviada ${formatDateTime(r.created_at)}`}</p>
            </div>
            <StatusBadge status={r.status} />
          </>
        )}
      </header>
      <div className="flex flex-col gap-4">
        <Body receipt={r} />
        <ManageOriginal receipt={r} />
      </div>
    </>
  );
}

/** Under review the editor is what shows, with «Eliminar talão» at its foot. */
const inReview = (r: Receipt) => !IN_PROGRESS.has(r.status) && !r.error && EDITABLE.has(r.status);

/** A photo whose products were not read well (F-230): another photo is asked for first. The reason goes once the edits fix the reading. */
const asksForAnotherPhoto = (r: Receipt) => EDITABLE.has(r.status) && r.review_reasons.some((x) => x.code === "illegible");

function Body({ receipt: r }: { receipt: Receipt }) {
  const [fixByHand, setFixByHand] = useState(false);
  if (IN_PROGRESS.has(r.status)) return <Processing receipt={r} />;
  if (r.error) return <Failure receipt={r} />;
  if (asksForAnotherPhoto(r) && !fixByHand) return <AnotherPhoto receipt={r} onFixByHand={() => setFixByHand(true)} />;
  return (
    <>
      {r.quality_warnings.length > 0 && (
        <Notice
          tone="info"
          title="A fotografia pode ser melhorada"
          action={
            <LinkButton to="/adicionar" variant="secondary">
              Tire outra foto
            </LinkButton>
          }
        >
          {r.quality_warnings.map((w) => w.message).join(" ")}
        </Notice>
      )}
      {r.duplicate_of_receipt_id && !r.duplicate_acknowledged && <DuplicateChoice receipt={r} />}
      {r.review_reasons.some((x) => x.code === "merchant_unknown") && <MerchantChoice receipt={r} />}
      {inReview(r) ? <ReviewEditor key={r.version} receipt={r} /> : <ConfirmedReceipt receipt={r} />}
    </>
  );
}

const STEPS = [
  { status: "RECEIVED", label: "Recebida" },
  { status: "VALIDATING", label: "A validar o ficheiro" },
  { status: "EXTRACTING", label: "A ler os produtos" },
] as const;

function Processing({ receipt: r }: { receipt: Receipt }) {
  const current = STEPS.findIndex((s) => s.status === r.status);
  const noJob = r.status === "RECEIVED" && !r.processing;
  if (noJob) {
    return (
      <Notice tone="warning" title="O envio deste talão não terminou">
        O ficheiro não chegou ao servidor. Elimine esta entrada e envie o talão novamente.
      </Notice>
    );
  }
  return (
    <section aria-live="polite" className="rounded-surface bg-paper p-5">
      <ol className="flex flex-col gap-3">
        {STEPS.map((s, i) => (
          <li key={s.status} className="flex items-center gap-3">
            <span
              aria-hidden
              className={`grid size-8 place-items-center rounded-full text-sm font-bold ${
                i < current ? "bg-ok-soft text-ok" : i === current ? "animate-pulse bg-brand text-on-brand" : "bg-ground text-ink-soft"
              }`}
            >
              {i + 1}
            </span>
            <span className={i === current ? "font-semibold" : "text-ink-soft"}>
              {s.label}
              {i === current && <span className="sr-only"> (em curso)</span>}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm text-ink-soft">
        Normalmente demora menos de um minuto. Pode sair deste ecrã: a compra aparece na lista quando estiver pronta.
      </p>
    </section>
  );
}

/** «Tirar outra foto» drops this reading (the receipt is still in hand) and opens the camera again. */
function AnotherPhoto({ receipt: r, onFixByHand }: { receipt: Receipt; onFixByHand: () => void }) {
  const retake = useDeleteReceipt(r.id, "/adicionar");
  return (
    <Notice
      tone="warning"
      title="Não conseguimos ler bem este talão"
      action={
        <>
          <Button busy={retake.isPending} onClick={() => retake.mutate()}>
            Tirar outra foto
          </Button>
          <Button variant="quiet" disabled={retake.isPending} onClick={onFixByHand}>
            Corrigir à mão
          </Button>
        </>
      }
    >
      Faltam produtos ou o total. Fotografe-o de novo: o talão inteiro, bem iluminado e sobre um fundo escuro.
      {retake.error && <p className="mt-2">{retake.error.message}</p>}
    </Notice>
  );
}

function Failure({ receipt: r }: { receipt: Receipt }) {
  const qc = useQueryClient();
  const retry = useMutation({
    mutationFn: async () =>
      unwrap(
        await api.POST("/v1/receipts/{receipt_id}/process", {
          params: { path: { receipt_id: r.id }, header: { "Idempotency-Key": crypto.randomUUID() } },
        }),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["receipt", r.id] }),
  });
  const retryable = r.status === "TEMPORARY_FAILURE" || r.status === "UNREADABLE";
  return (
    <Notice
      tone="error"
      title={r.error?.message ?? "Não foi possível processar o talão"}
      action={
        retryable && (
          <Button variant="secondary" busy={retry.isPending} onClick={() => retry.mutate()}>
            Processar novamente
          </Button>
        )
      }
    >
      {r.error?.action}
      {retry.error && <p className="mt-2">{retry.error.message}</p>}
    </Notice>
  );
}

function DuplicateChoice({ receipt: r }: { receipt: Receipt }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const decide = useMutation({
    mutationFn: async (action: "keep" | "discard") =>
      unwrap(await api.POST("/v1/receipts/{receipt_id}/duplicate-decision", { params: { path: { receipt_id: r.id } }, body: { action } })),
    onSuccess: (_, action) => {
      void invalidateReceiptData(qc);
      if (action === "discard") navigate("/compras", { replace: true });
      else void qc.invalidateQueries({ queryKey: ["receipt", r.id] });
    },
  });
  return (
    <Notice
      tone="warning"
      title="Esta compra parece repetida"
      action={
        <>
          <Button variant="secondary" busy={decide.isPending && decide.variables === "keep"} onClick={() => decide.mutate("keep")}>
            Manter as duas
          </Button>
          <Button variant="quiet" busy={decide.isPending && decide.variables === "discard"} onClick={() => decide.mutate("discard")}>
            Descartar esta
          </Button>
        </>
      }
    >
      Já existe uma compra no mesmo supermercado, à mesma hora e com o mesmo total.{" "}
      <Link className="font-semibold text-brand underline" to={`/compras/${r.duplicate_of_receipt_id}`}>
        Ver a outra compra
      </Link>
    </Notice>
  );
}

function MerchantChoice({ receipt: r }: { receipt: Receipt }) {
  const qc = useQueryClient();
  const [choice, setChoice] = useState("");
  const send = useMutation({
    mutationFn: async (merchant: string) =>
      unwrap(
        await api.POST("/v1/receipts/{receipt_id}/merchant", {
          params: { path: { receipt_id: r.id } },
          body: { merchant: merchant as Schemas["MerchantChoiceIn"]["merchant"] },
        }),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["receipt", r.id] }),
  });
  return (
    <Notice tone="info" title="Não reconhecemos a loja">
      <p>
        Se for uma destas lojas, escolha-a para lermos o talão com as regras certas. Se não for, siga para a revisão
        e indique o nome da loja.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <Select label="Loja" value={choice} onChange={(e) => setChoice(e.target.value)} className="flex-1">
          <option value="">Escolher…</option>
          {MERCHANT_OPTIONS.map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </Select>
        <Button variant="secondary" disabled={!choice} busy={send.isPending} onClick={() => send.mutate(choice)}>
          Ler novamente
        </Button>
      </div>
    </Notice>
  );
}

function ConfirmedReceipt({ receipt: r }: { receipt: Receipt }) {
  return (
    <>
    <article className="receipt-paper" aria-label="Talão da compra">
      <p className="text-center font-semibold">{merchantName(r.merchant, r.merchant_name).toUpperCase()}</p>
      {r.store_label && <p className="text-center">{r.store_label}</p>}
      <p className="text-center text-ink-soft">{formatDate(r.purchase_at)}</p>
      {r.receipt_ref && <p className="text-center text-ink-soft">{r.receipt_ref}</p>}
      <hr />
      <ul className="flex flex-col gap-1">
        {r.lines.map((l) => (
          <li key={l.id}>
            <div className="flex justify-between gap-3">
              {l.product ? (
                <Link to={`/produtos/${l.product.id}`} className="underline decoration-dotted underline-offset-4">
                  {l.raw_description}
                </Link>
              ) : (
                <span>{l.raw_description || "Produto não identificado"}</span>
              )}
              <span>{formatAmount(l.line_total_cents)}</span>
            </div>
            {(l.quantity !== "1.000" || l.unit !== "un") && (
              <div className="text-ink-soft">
                {formatQuantity(l.quantity, l.unit)} x {formatCents(l.unit_price_cents)}
              </div>
            )}
            {l.discount_cents > 0 && (
              <div className="flex justify-between text-ink-soft">
                <span>Desconto</span>
                <span>−{formatAmount(l.discount_cents)}</span>
              </div>
            )}
            <PriceCheck check={l.grouping?.price_check} />
          </li>
        ))}
      </ul>
      <hr />
      <p className="flex justify-between font-semibold">
        <span>TOTAL</span>
        <span>{formatCents(r.totals.recalculated_total_cents)}</span>
      </p>
      {r.totals.tax_cents !== null && (
        <p className="flex justify-between text-ink-soft">
          <span>IVA incluído</span>
          <span>{formatCents(r.totals.tax_cents)}</span>
        </p>
      )}
      <hr />
      <p className="text-center text-ink-soft">
        {r.confirmed_by === "AUTO" ? "Confirmada automaticamente" : "Confirmada por si"} em {formatDate(r.confirmed_at)}
      </p>
    </article>
    {!!r.ungrouped_descriptions && (
      <Notice
        tone="info"
        action={
          <LinkButton to="/por-completar" variant="secondary">
            Completar
          </LinkButton>
        }
      >
        {plural(r.ungrouped_descriptions, "produto deste talão ficou", "produtos deste talão ficaram")} por agrupar.{" "}
        Agrupá-los permite comparar o que paga por eles.
      </Notice>
    )}
    {r.status === "CONFIRMED" && <EditValidated receipt={r} />}
    <div className="flex gap-3">
      <LinkButton to="/" variant="secondary" className="flex-1">
        <Home aria-hidden className="size-5" /> Início
      </LinkButton>
      <LinkButton to="/adicionar" className="flex-1">
        <Plus aria-hidden className="size-5" /> Adicionar outro talão
      </LinkButton>
    </div>
    </>
  );
}

/** «Editar talão» on a validated receipt (spec 018): asks first, since the receipt goes back to review and out of the spending until it is
 * confirmed again. The reopened receipt comes back in review, so the page shows the editor. */
function EditValidated({ receipt: r }: { receipt: Receipt }) {
  const qc = useQueryClient();
  const [asking, setAsking] = useState(false);
  const reopen = useMutation({
    mutationFn: async () =>
      unwrap(await api.POST("/v1/receipts/{receipt_id}/reopen", { params: { path: { receipt_id: r.id } }, body: { version: r.version } })),
    onSuccess: (reopened) => receiptChanged(qc, reopened),
  });
  if (!asking) {
    return (
      <Button variant="secondary" onClick={() => setAsking(true)}>
        <Pencil aria-hidden className="size-5" /> Editar talão
      </Button>
    );
  }
  return (
    <FootQuestion>
      <Notice
        tone="warning"
        title="Este talão já foi validado"
        action={
          <>
            <Button busy={reopen.isPending} onClick={() => reopen.mutate()}>
              Sim, editar
            </Button>
            <Button variant="quiet" disabled={reopen.isPending} onClick={() => setAsking(false)}>
              Cancelar
            </Button>
          </>
        }
      >
        Se o editar, volta a ficar por rever e deixa de contar nos gastos até o confirmar outra vez. Quer continuar?
        {reopen.error && <p className="mt-2">{reopen.error.message}</p>}
      </Notice>
    </FootQuestion>
  );
}

function ManageOriginal({ receipt: r }: { receipt: Receipt }) {
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState<"receipt" | "original" | null>(null);
  const view = useOriginalViewer(r.id);
  const removeOriginal = useMutation({
    mutationFn: async () => unwrap(await api.DELETE("/v1/receipts/{receipt_id}/original", { params: { path: { receipt_id: r.id } } })),
    onSuccess: (updated) => {
      qc.setQueryData(["receipt", r.id], updated);
      setConfirming(null);
    },
  });
  if (IN_PROGRESS.has(r.status) && r.processing) return null;

  return (
    <section aria-labelledby="ficheiro" className="mt-2 flex flex-col gap-3 rounded-surface bg-paper p-4">
      <h2 id="ficheiro" className="font-bold">
        Ficheiro e dados
      </h2>
      {r.original_available ? (
        <p className="text-sm text-ink-soft">
          {r.original_expires_at
            ? `O ficheiro original é apagado automaticamente a ${formatDate(r.original_expires_at)}.`
            : "O ficheiro original é apagado 30 dias depois de confirmar a compra."}
        </p>
      ) : (
        <p className="text-sm text-ink-soft">O ficheiro original já foi apagado. Os dados da compra mantêm-se.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {r.original_available && (
          <>
            {/* Under review the original opens from «Ver talão original», beside the products. */}
            {!inReview(r) &&
              Array.from({ length: r.photo_count }, (_, i) => (
                <Button key={i} variant="secondary" busy={view.isPending && view.variables === i + 1} onClick={() => view.mutate(i + 1)}>
                  <ExternalLink aria-hidden className="size-4" /> {r.photo_count > 1 ? `Ver foto ${i + 1}` : "Ver original"}
                </Button>
              ))}
            <Button variant="quiet" onClick={() => setConfirming("original")}>
              Apagar só o ficheiro
            </Button>
          </>
        )}
        {!inReview(r) && (
          <Button variant="dangerQuiet" onClick={() => setConfirming("receipt")}>
            Eliminar compra
          </Button>
        )}
      </div>
      {confirming === "original" && (
        <FootQuestion>
          <Notice
            tone="warning"
            title="Apagar o ficheiro original?"
            action={
              <>
                <Button variant="danger" busy={removeOriginal.isPending} onClick={() => removeOriginal.mutate()}>
                  Apagar ficheiro
                </Button>
                <Button variant="quiet" onClick={() => setConfirming(null)}>
                  Cancelar
                </Button>
              </>
            }
          >
            Os produtos, preços e totais continuam guardados. Deixa de poder ver a imagem ou o PDF.
          </Notice>
        </FootQuestion>
      )}
      {confirming === "receipt" && <DeleteReceiptNotice receiptId={r.id} onCancel={() => setConfirming(null)} />}
      {[view.error, removeOriginal.error].filter(Boolean).map((e, i) => (
        <Notice key={i} tone="error">
          {e!.message}
        </Notice>
      ))}
    </section>
  );
}
