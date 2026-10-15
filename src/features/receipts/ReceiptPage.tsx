import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ApiError, api, unwrap, type Schemas } from "../../api/client";
import { Button, Notice, Select, Spinner, StatusBadge } from "../../components/ui";
import { formatAmount, formatCents, formatDate, formatDateTime, formatQuantity, merchantName } from "../../lib/format";
import { EDITABLE, IN_PROGRESS } from "../../lib/status";
import { ReviewEditor } from "./ReviewEditor";

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
        <Notice tone="error" title={query.error instanceof ApiError && query.error.status === 404 ? "Compra não encontrada" : "Erro ao carregar"}>
          {query.error.message}
        </Notice>
      </div>
    );
  }
  const r = query.data!;
  return (
    <>
      <header className="flex items-center gap-3 pb-4 pt-6">
        <Link to="/compras" aria-label="Voltar às compras" className="grid size-11 place-items-center rounded-full hover:bg-cobalt-soft">
          <ArrowLeft aria-hidden className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-extrabold tracking-tight">{r.merchant && r.merchant !== "UNKNOWN" ? merchantName(r.merchant) : "Nova compra"}</h1>
          <p className="text-sm text-ink-soft">{r.purchase_at ? formatDateTime(r.purchase_at) : `Enviada ${formatDateTime(r.created_at)}`}</p>
        </div>
        <StatusBadge status={r.status} />
      </header>
      <div className="flex flex-col gap-4">
        <Body receipt={r} />
        <ManageOriginal receipt={r} />
      </div>
    </>
  );
}

function Body({ receipt: r }: { receipt: Receipt }) {
  if (IN_PROGRESS.has(r.status)) return <Processing receipt={r} />;
  if (r.error) return <Failure receipt={r} />;
  return (
    <>
      {r.quality_warnings.length > 0 && (
        <Notice tone="info" title="A fotografia pode ser melhorada">
          {r.quality_warnings.map((w) => w.message).join(" ")} Se os valores não estiverem certos, tire uma nova fotografia.
        </Notice>
      )}
      {r.duplicate_of_receipt_id && !r.duplicate_acknowledged && <DuplicateChoice receipt={r} />}
      {r.review_reasons.some((x) => x.code === "merchant_unknown") && <MerchantChoice receipt={r} />}
      {EDITABLE.has(r.status) ? <ReviewEditor key={r.version} receipt={r} /> : <ConfirmedReceipt receipt={r} />}
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
      <Notice tone="warning" title="O envio desta nota não terminou">
        O ficheiro não chegou ao servidor. Elimine esta entrada e envie a nota novamente.
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
                i < current ? "bg-ok-soft text-ok" : i === current ? "animate-pulse bg-cobalt text-white dark:text-ground" : "bg-ground text-ink-soft"
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
      title={r.error?.message ?? "Não foi possível processar a nota"}
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
      void qc.invalidateQueries({ queryKey: ["receipts"] });
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
      <Link className="font-semibold text-cobalt underline" to={`/compras/${r.duplicate_of_receipt_id}`}>
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
    <Notice tone="warning" title="Não reconhecemos o supermercado">
      <p>Escolha o supermercado para lermos a nota com as regras certas.</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <Select label="Supermercado" value={choice} onChange={(e) => setChoice(e.target.value)} className="flex-1">
          <option value="">Escolher…</option>
          <option value="CONTINENTE">Continente</option>
          <option value="PINGO_DOCE">Pingo Doce</option>
          <option value="LIDL">Lidl</option>
          <option value="AUCHAN">Auchan</option>
        </Select>
        <Button disabled={!choice} busy={send.isPending && send.variables !== "UNSUPPORTED"} onClick={() => send.mutate(choice)}>
          Ler novamente
        </Button>
      </div>
      <button className="mt-3 text-sm font-semibold text-cobalt underline" onClick={() => send.mutate("UNSUPPORTED")}>
        É de outro supermercado (não suportado)
      </button>
    </Notice>
  );
}

function ConfirmedReceipt({ receipt: r }: { receipt: Receipt }) {
  return (
    <article className="receipt-paper" aria-label="Nota da compra">
      <p className="text-center font-semibold">{merchantName(r.merchant).toUpperCase()}</p>
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
  );
}

function ManageOriginal({ receipt: r }: { receipt: Receipt }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState<"receipt" | "original" | null>(null);
  const view = useMutation({
    mutationFn: async () => unwrap(await api.GET("/v1/receipts/{receipt_id}/original", { params: { path: { receipt_id: r.id } } })),
    onSuccess: (o) => window.open(o.url, "_blank", "noopener,noreferrer"),
  });
  const removeOriginal = useMutation({
    mutationFn: async () => unwrap(await api.DELETE("/v1/receipts/{receipt_id}/original", { params: { path: { receipt_id: r.id } } })),
    onSuccess: (updated) => {
      qc.setQueryData(["receipt", r.id], updated);
      setConfirming(null);
    },
  });
  const removeReceipt = useMutation({
    mutationFn: async () => {
      const res = await api.DELETE("/v1/receipts/{receipt_id}", { params: { path: { receipt_id: r.id } } });
      if (!res.response.ok) unwrap(res);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["receipts"] });
      void qc.invalidateQueries({ queryKey: ["summary"] });
      navigate("/compras", { replace: true });
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
            <Button variant="secondary" busy={view.isPending} onClick={() => view.mutate()}>
              <ExternalLink aria-hidden className="size-4" /> Ver original
            </Button>
            <Button variant="quiet" onClick={() => setConfirming("original")}>
              Apagar só o ficheiro
            </Button>
          </>
        )}
        <Button variant="dangerQuiet" onClick={() => setConfirming("receipt")}>
          Eliminar compra
        </Button>
      </div>
      {confirming === "original" && (
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
      )}
      {confirming === "receipt" && (
        <Notice
          tone="warning"
          title="Eliminar esta compra?"
          action={
            <>
              <Button variant="danger" busy={removeReceipt.isPending} onClick={() => removeReceipt.mutate()}>
                Eliminar compra
              </Button>
              <Button variant="quiet" onClick={() => setConfirming(null)}>
                Cancelar
              </Button>
            </>
          }
        >
          A compra e o ficheiro são apagados e deixam de contar no resumo. Não é possível desfazer.
        </Notice>
      )}
      {[view.error, removeOriginal.error, removeReceipt.error].filter(Boolean).map((e, i) => (
        <Notice key={i} tone="error">
          {e!.message}
        </Notice>
      ))}
    </section>
  );
}
