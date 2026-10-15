import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, unwrap, type JobStatus, type Merchant, type Schemas } from "../../api/client";
import { Button, Field, Notice, PageHeader, Select, Spinner, Surface } from "../../components/ui";
import { formatCents, formatDateTime, merchantName } from "../../lib/format";
import { lisbonToday } from "../../lib/period";

const TABS = [
  { id: "metrics", label: "Métricas" },
  { id: "jobs", label: "Processamento" },
  { id: "merchants", label: "Supermercados" },
] as const;

export default function AdminPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("metrics");
  return (
    <>
      <PageHeader title="Operador" />
      <p className="-mt-2 mb-4 text-sm text-ink-soft">Dados técnicos e agregados. O conteúdo das notas não é visível aqui.</p>
      <div role="tablist" aria-label="Secções do operador" className="mb-4 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-controls={`panel-${t.id}`}
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className="min-h-11 rounded-full px-4 text-sm font-semibold ring-1 ring-inset ring-line aria-selected:bg-cobalt aria-selected:text-white aria-selected:ring-cobalt dark:aria-selected:text-ground"
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "metrics" && <Metrics />}
        {tab === "jobs" && <Jobs />}
        {tab === "merchants" && <Merchants />}
      </div>
    </>
  );
}

function pct(v: unknown): string {
  return typeof v === "number" ? `${v.toLocaleString("pt-PT")} %` : "—";
}

function Metrics() {
  const { y } = lisbonToday();
  const [from, setFrom] = useState(`${y}-01-01`);
  const [to, setTo] = useState(`${y}-12-31`);
  const q = useQuery({
    queryKey: ["admin", "metrics", from, to],
    queryFn: async () => unwrap(await api.GET("/v1/admin/metrics", { params: { query: { from, to } } })) as Record<string, unknown>,
  });
  const m = q.data;
  const uploads = (m?.uploads ?? {}) as Record<string, unknown>;
  const rows: [string, string][] = m
    ? [
        ["Notas enviadas", String(uploads.total ?? 0)],
        ["Uploads concluídos (confirmados)", pct(uploads.confirmed_pct)],
        ["Confirmadas automaticamente", String(uploads.auto_confirmed ?? 0)],
        ["Tempo mediano até confirmação", m.median_seconds_to_user_confirmation ? `${Math.round(Number(m.median_seconds_to_user_confirmation) / 60)} min` : "—"],
        ["Linhas confirmadas sem alteração", pct(m.lines_confirmed_without_change_pct)],
        ["Taxa de duplicados", pct(m.duplicate_rate_pct)],
        ["Utilizadores ativos (30 dias)", String(m.monthly_active_users ?? 0)],
        ["Sem OCR/IA externo", pct(m.without_external_pct)],
        ["Linhas resolvidas sem LLM", pct(m.lines_resolved_without_llm_pct)],
        ["Chamadas externas", String(m.external_calls ?? 0)],
        ["Custo externo estimado", formatCents(Number(m.external_cost_cents ?? 0))],
        ["Processamento p95", m.p95_processing_seconds ? `${m.p95_processing_seconds} s` : "—"],
      ]
    : [];
  const perMerchant = Object.entries((m?.receipts_per_merchant ?? {}) as Record<string, number>);
  const routes = Object.entries((m?.routes ?? {}) as Record<string, number>);
  const errors = Object.entries((m?.error_rate_by_source_type ?? {}) as Record<string, number | null>);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="De" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Field label="Até" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      {q.isLoading && <Spinner />}
      {q.error && <Notice tone="error">{q.error.message}</Notice>}
      {m && (
        <>
          <Surface>
            <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
              {rows.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-line py-2 text-sm">
                  <dt className="text-ink-soft">{k}</dt>
                  <dd className="font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </Surface>
          <div className="grid gap-4 sm:grid-cols-3">
            <KeyValues title="Notas por supermercado" entries={perMerchant.map(([k, v]) => [merchantName(k), String(v)])} />
            <KeyValues title="Rotas de processamento" entries={routes.map(([k, v]) => [k, String(v)])} />
            <KeyValues title="Erros por tipo de documento" entries={errors.map(([k, v]) => [k, pct(v)])} />
          </div>
        </>
      )}
    </div>
  );
}

function KeyValues({ title, entries }: { title: string; entries: [string, string][] }) {
  return (
    <Surface>
      <h2 className="mb-2 font-bold">{title}</h2>
      {entries.length === 0 ? (
        <p className="text-sm text-ink-soft">Sem dados.</p>
      ) : (
        <dl>
          {entries.map(([k, v]) => (
            <div key={k} className="flex justify-between py-1 text-sm">
              <dt>{k}</dt>
              <dd className="font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </Surface>
  );
}

function Jobs() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("FAILED");
  const q = useQuery({
    queryKey: ["admin", "jobs", status],
    queryFn: async () => unwrap(await api.GET("/v1/admin/jobs", { params: { query: { status: (status || undefined) as JobStatus, limit: 100 } } })),
  });
  const reprocess = useMutation({
    mutationFn: async (id: string) => unwrap(await api.POST("/v1/admin/jobs/{job_id}/reprocess", { params: { path: { job_id: id } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "jobs"] }),
  });
  return (
    <div className="flex flex-col gap-3">
      <Select label="Estado" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="FAILED">Falhados</option>
        <option value="RETRY">Em nova tentativa</option>
        <option value="RUNNING">Em curso</option>
        <option value="QUEUED">Em fila</option>
        <option value="SUCCEEDED">Concluídos</option>
        <option value="">Todos</option>
      </Select>
      {q.isLoading && <Spinner />}
      {q.error && <Notice tone="error">{q.error.message}</Notice>}
      {q.data?.length === 0 && <Notice tone="success">Nada a mostrar com este estado.</Notice>}
      {reprocess.error && <Notice tone="error">{reprocess.error.message}</Notice>}
      <ul className="flex flex-col gap-2">
        {q.data?.map((j) => (
          <li key={j.id}>
            <Surface className="text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-semibold">
                  {j.status}
                  {j.error_code && `: ${j.error_code}`}
                </span>
                <span className="text-ink-soft">{formatDateTime(j.created_at)}</span>
              </div>
              <p className="mt-1 text-ink-soft">
                {[j.merchant && merchantName(j.merchant), j.source_type, j.processing_route, j.parser_version, `${j.attempt_count} tentativa(s)`]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              {j.status === "FAILED" && (
                <Button variant="secondary" className="mt-3" busy={reprocess.isPending && reprocess.variables === j.id} onClick={() => reprocess.mutate(j.id)}>
                  Reprocessar
                </Button>
              )}
            </Surface>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Merchants() {
  const q = useQuery({
    queryKey: ["admin", "merchants"],
    queryFn: async () => unwrap(await api.GET("/v1/admin/merchants")),
  });
  if (q.isLoading) return <Spinner />;
  if (q.error) return <Notice tone="error">{q.error.message}</Notice>;
  return (
    <div className="flex flex-col gap-3">
      {q.data?.map((c) => (
        <MerchantForm key={c.merchant} config={c} />
      ))}
    </div>
  );
}

const FIELDS = ["quantity", "unit_price", "line_total", "description", "purchase_at", "total"] as const;
const FIELD_LABEL: Record<(typeof FIELDS)[number], string> = {
  quantity: "Quantidade",
  unit_price: "Preço unitário",
  line_total: "Total da linha",
  description: "Descrição",
  purchase_at: "Data",
  total: "Total da nota",
};

function MerchantForm({ config }: { config: Schemas["MerchantConfigOut"] }) {
  const qc = useQueryClient();
  const [enabled, setEnabled] = useState(config.enabled);
  const [threshold, setThreshold] = useState(String(config.default_threshold));
  const [tolerance, setTolerance] = useState(String(config.reconciliation_tolerance_cents));
  const [fields, setFields] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(config.field_thresholds).map(([k, v]) => [k, String(v)])),
  );
  const save = useMutation({
    mutationFn: async () =>
      unwrap(
        await api.PUT("/v1/admin/merchants/{merchant}", {
          params: { path: { merchant: config.merchant as Merchant } },
          body: {
            enabled,
            default_threshold: Number(threshold),
            reconciliation_tolerance_cents: Number(tolerance),
            field_thresholds: Object.fromEntries(
              Object.entries(fields)
                .filter(([, v]) => v.trim() !== "")
                .map(([k, v]) => [k, Number(v.replace(",", "."))]),
            ),
          },
        }),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "merchants"] }),
  });
  return (
    <Surface>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-bold">{merchantName(config.merchant)}</h2>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" className="size-5 accent-cobalt" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            Ativo
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Limiar de confiança" inputMode="decimal" value={threshold} onChange={(e) => setThreshold(e.target.value)} hint="Entre 0,5 e 1" />
          <Field label="Tolerância dos totais (cêntimos)" inputMode="numeric" value={tolerance} onChange={(e) => setTolerance(e.target.value)} />
        </div>
        <details>
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-cobalt">Limiar por campo</summary>
          <div className="grid grid-cols-2 gap-3 pt-2">
            {FIELDS.map((f) => (
              <Field
                key={f}
                label={FIELD_LABEL[f]}
                inputMode="decimal"
                placeholder={threshold}
                value={fields[f] ?? ""}
                onChange={(e) => setFields((all) => ({ ...all, [f]: e.target.value }))}
              />
            ))}
          </div>
        </details>
        {save.error && <Notice tone="error">{save.error.message}</Notice>}
        {save.isSuccess && <Notice tone="success">Regras guardadas.</Notice>}
        <Button type="submit" variant="secondary" busy={save.isPending}>
          Guardar regras
        </Button>
      </form>
    </Surface>
  );
}
