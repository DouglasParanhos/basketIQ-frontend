import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Printer, X } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { api, unwrap, type Merchant, type Schemas } from "../../api/client";
import { DataTable, SpendBars, type Point } from "../../components/charts";
import { Button, ErrorNotice, LinkButton, Notice, Select, Spinner } from "../../components/ui";
import { formatCents, formatMonth, formatPercent, formatVariationAgainst } from "../../lib/format";
import { MERCHANT_OPTIONS, merchantName, merchantStyle } from "../../lib/merchants";
import { describePeriod, lisbonToday, periodFor, type Period, type PeriodKind } from "../../lib/period";
import { usePrintInLight } from "../../lib/theme";
import { PeriodPicker } from "./PeriodPicker";

type Summary = Schemas["SummaryOut"];

const dayShort = new Intl.DateTimeFormat("pt-PT", { day: "numeric", timeZone: "UTC" });
const dayLong = new Intl.DateTimeFormat("pt-PT", { weekday: "short", day: "numeric", month: "long", timeZone: "UTC" });
const dateLong = new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "long", year: "numeric" });
const monthShort = new Intl.DateTimeFormat("pt-PT", { month: "short", timeZone: "UTC" });

function usePeriodParams() {
  const [params, setParams] = useSearchParams();
  const today = lisbonToday();
  const kind = (params.get("periodo") as PeriodKind | null) ?? "month";
  const period: Period =
    params.get("de") && params.get("ate")
      ? { kind, from: params.get("de")!, to: params.get("ate")! }
      : periodFor(kind === "custom" ? "month" : kind, { y: today.y, m0: today.m0 });
  const merchant = params.get("mercado");
  const product = params.get("produto") ? { id: params.get("produto")!, name: params.get("produto_nome") ?? "" } : null;
  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    setParams(next, { replace: true });
  };
  return { period, merchant, product, update };
}

function points(summary: Summary): Point[] {
  return summary.series.points.map((p) => {
    if (summary.series.granularity === "day") {
      const d = new Date(`${p.period}T00:00:00Z`);
      return { label: dayLong.format(d), short: dayShort.format(d), cents: p.spent_cents };
    }
    const d = new Date(`${p.period}-01T00:00:00Z`);
    return { label: formatMonth(p.period), short: monthShort.format(d), cents: p.spent_cents };
  });
}

/** Only on paper: what the page is about, since the filters are hidden there. Says the figures are the person's own, not official. */
function PrintHeader({ period, merchant, product }: { period: Period; merchant: string | null; product?: string }) {
  const scope = [merchant ? merchantName(merchant) : "Todos os supermercados", product].filter(Boolean).join(" · ");
  return (
    <header className="hidden print:block">
      <p className="text-sm">Super Mercado</p>
      <h2 className="font-display text-2xl font-semibold first-letter:uppercase">Resumo de compras · {describePeriod(period)}</h2>
      <p className="text-sm">{scope}</p>
      <p className="text-xs">
        Valores dos seus talões confirmados, gerados a {dateLong.format(new Date())}. Não são preços oficiais dos supermercados.
      </p>
    </header>
  );
}

export function DashboardPage() {
  usePrintInLight();
  const { period, merchant, product, update } = usePeriodParams();
  const merchantFilter = (merchant ?? undefined) as Merchant | undefined;
  // Fired next to the summary so the two requests run in parallel.
  const consumption = useQuery({
    queryKey: ["consumption", period.from, period.to, merchant],
    queryFn: async () =>
      unwrap(
        await api.GET("/v1/analytics/consumption", {
          params: { query: { from: period.from, to: period.to, merchant: merchantFilter, limit: 5 } },
        }),
      ),
    placeholderData: keepPreviousData,
  });
  const query = useQuery({
    queryKey: ["summary", period.from, period.to, merchant, product?.id],
    queryFn: async () =>
      unwrap(
        await api.GET("/v1/analytics/summary", {
          params: {
            query: {
              from: period.from,
              to: period.to,
              merchant: merchantFilter,
              product_id: product?.id,
            },
          },
        }),
      ),
    placeholderData: keepPreviousData,
  });
  const anyReceipts = useQuery({
    queryKey: ["receipts", "any"],
    queryFn: async () => unwrap(await api.GET("/v1/receipts", { params: { query: { limit: 1 } } })),
  });

  const s = query.data;

  return (
    <div className="flex flex-col gap-5 pt-3">
      <h2 className="sr-only">Resumo</h2>

      {anyReceipts.data && anyReceipts.data.items.length === 0 ? (
        <section className="flex flex-col items-start gap-4 rounded-surface bg-paper p-6">
          <h2 className="text-2xl font-extrabold leading-tight">Comece pelo primeiro talão</h2>
          <p className="text-ink-soft">
            Fotografe o talão do supermercado ou envie a fatura em PDF. Assim que for lida, aparece aqui quanto gastou, onde e em quê.
          </p>
          <LinkButton to="/adicionar">Adicionar o primeiro talão</LinkButton>
        </section>
      ) : (
        <>
          <PrintHeader period={period} merchant={merchant} product={product?.name} />
          <div className="print:hidden">
            <PeriodPicker
              value={period}
              onChange={(p) => update({ periodo: p.kind === "month" ? null : p.kind, de: p.from, ate: p.to })}
            />
          </div>
          <div className="flex flex-wrap items-end gap-3 print:hidden">
            <Select
              label="Supermercado"
              value={merchant ?? ""}
              onChange={(e) => update({ mercado: e.target.value || null })}
              className="min-w-44 flex-1"
            >
              <option value="">Todos os supermercados</option>
              {MERCHANT_OPTIONS.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </Select>
            {product && (
              <span className="inline-flex min-h-12 items-center gap-2 rounded-full bg-brand-soft pl-4 pr-1 text-sm font-semibold">
                {product.name}
                <button
                  onClick={() => update({ produto: null, produto_nome: null })}
                  aria-label={`Remover filtro do produto ${product.name}`}
                  className="grid size-10 place-items-center rounded-full hover:bg-paper"
                >
                  <X aria-hidden className="size-4" />
                </button>
              </span>
            )}
          </div>

          {query.isLoading && <Spinner />}
          {query.error && <ErrorNotice what="carregar o resumo" error={query.error} onRetry={() => void query.refetch()} />}
          {s && <SummaryView summary={s} consumption={consumption.data} period={period} onProduct={(id, name) => update({ produto: id, produto_nome: name })} stale={query.isPlaceholderData} />}
          {s && (
            <Button variant="secondary" className="self-start print:hidden" onClick={() => window.print()}>
              <Printer aria-hidden className="size-4" /> Imprimir ou guardar em PDF
            </Button>
          )}
        </>
      )}
    </div>
  );
}

function Consumption({ data }: { data: Schemas["ConsumptionOut"] | undefined }) {
  if (!data || data.empty) return null;
  return (
    <section aria-labelledby="consumo" className="rounded-surface bg-paper p-4">
      <h2 id="consumo" className="mb-2 font-bold">
        Consumo habitual
      </h2>
      <ol className="flex flex-col">
        {data.items.map((p) => (
          <li key={p.product_id} className="flex items-center justify-between gap-3 border-b border-line py-2 text-sm last:border-0">
            <span className="flex min-w-0 flex-col">
              <Link to={`/produtos/${p.product_id}`} className="flex min-h-11 items-center truncate font-semibold hover:underline">
                {p.name}
              </Link>
              <span className="text-xs text-ink-soft">
                {p.purchases} {p.purchases === 1 ? "compra" : "compras"}
                {p.avg_interval_days !== null && ` · a cada ${p.avg_interval_days.toLocaleString("pt-PT")} dias`}
              </span>
            </span>
            <span className="amount shrink-0 font-semibold">{p.units_per_month.toLocaleString("pt-PT")} un./mês</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function SummaryView({
  summary: s,
  consumption,
  period,
  onProduct,
  stale,
}: {
  summary: Summary;
  consumption: Schemas["ConsumptionOut"] | undefined;
  period: Period;
  onProduct: (id: string, name: string) => void;
  stale: boolean;
}) {
  const previousLabel = describePeriod({ kind: period.kind, from: s.cards.previous_period.from, to: s.cards.previous_period.to });
  const variation = formatVariationAgainst(s.cards.variation_pct.total_spent, previousLabel);
  if (s.empty) {
    return (
      <Notice tone="info" title="Sem compras neste período" action={<LinkButton to="/adicionar" variant="secondary">Adicionar talão</LinkButton>}>
        Escolha outro período ou adicione um talão desta altura.
      </Notice>
    );
  }
  const pts = points(s);
  return (
    <div className={`flex flex-col gap-5 transition-opacity ${stale ? "opacity-60" : ""}`} aria-busy={stale}>
      <section aria-labelledby="gasto" className="rounded-surface bg-paper p-4 ring-1 ring-inset ring-line">
        <h2 id="gasto" className="text-[length:calc(0.6875rem_*_var(--text-scale))] font-semibold uppercase tracking-widest text-ink-soft">
          Gasto em supermercados · {s.cards.purchases} {s.cards.purchases === 1 ? "talão" : "talões"}
        </h2>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="amount font-display text-[length:calc(2.375rem_*_var(--text-scale))] font-semibold leading-none">{formatCents(s.cards.total_spent_cents)}</p>
          {variation && <span className="rounded-full bg-brand-soft px-3 py-1 text-[length:calc(13px_*_var(--text-scale))] font-bold text-brand-deep">{variation}</span>}
        </div>
        <p className="mt-2 text-sm text-ink-soft first-letter:uppercase">
          {variation ? `${previousLabel}: ${formatCents(s.cards.previous_period.total_spent_cents)}` : `Sem compras em ${previousLabel} para comparar.`}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4">
          <div>
            <dt className="text-xs text-ink-soft">Compras</dt>
            <dd className="text-xl font-bold">{s.cards.purchases}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-soft">Unidades</dt>
            <dd className="text-xl font-bold">{s.cards.units.replace(".", ",")}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="evolucao" className="rounded-surface bg-paper p-4 ring-1 ring-inset ring-line">
        <h2 id="evolucao" className="mb-2 font-bold">
          Gasto por {s.series.granularity === "day" ? "dia" : "mês"}
        </h2>
        {s.series.insufficient_data ? (
          <p className="py-6 text-sm text-ink-soft">Ainda há poucas compras neste período para mostrar uma evolução.</p>
        ) : (
          <SpendBars points={pts} title={`Gasto por ${s.series.granularity === "day" ? "dia" : "mês"}`} />
        )}
        <DataTable
          caption="Gasto por período"
          head={["Período", "Gasto"]}
          rows={pts.filter((p) => p.cents > 0).map((p) => [p.label, formatCents(p.cents)])}
        />
      </section>

      <section aria-labelledby="mercados" className="rounded-surface bg-paper p-4 ring-1 ring-inset ring-line">
        <h2 id="mercados" className="mb-3 font-bold">
          Por supermercado
        </h2>
        <ul className="flex flex-col gap-3">
          {s.by_merchant.map((m) => (
            <li key={m.merchant}>
              <div className="grid grid-cols-[5.25rem_1fr_auto] items-center gap-3 text-sm">
                <span className="truncate font-semibold">{merchantName(m.merchant)}</span>
                <div aria-hidden className="h-2.5 rounded-full bg-line">
                  <div className="h-2.5 rounded-full" style={{ width: `${Math.max(m.share_pct, 1)}%`, backgroundColor: merchantStyle(m.merchant).bar }} />
                </div>
                <span>
                  {formatCents(m.spent_cents)} <span className="text-ink-soft">({formatPercent(m.share_pct)})</span>
                </span>
              </div>
              <p className="mt-0.5 text-xs text-ink-soft">
                {m.purchases} {m.purchases === 1 ? "compra" : "compras"}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid grid-cols-2 gap-4 rounded-surface bg-paper p-4 ring-1 ring-inset ring-line">
        <Ranking title="Mais gasto" items={s.top_products_by_value} value={(p) => formatCents(p.spent_cents)} onProduct={onProduct} />
        <Ranking title="Mais comprados" items={s.top_products_by_quantity} value={(p) => `${p.units.replace(".", ",")} un.`} onProduct={onProduct} />
      </div>
      <Consumption data={consumption} />
      <p className="text-xs text-ink-soft">
        Só entram no resumo as compras confirmadas. Produtos vendidos ao peso contam como uma unidade.
      </p>
    </div>
  );
}

function Ranking({
  title,
  items,
  value,
  onProduct,
}: {
  title: string;
  items: Schemas["ProductRanking"][];
  value: (p: Schemas["ProductRanking"]) => string;
  onProduct: (id: string, name: string) => void;
}) {
  return (
    <section className="min-w-0">
      <h2 className="mb-2 font-bold">{title}</h2>
      <ol className="flex flex-col">
        {items.slice(0, 3).map((p) => (
          <li key={p.product_id ?? p.name} className="flex flex-col gap-0.5 border-b border-line py-2 text-xs last:border-0">
            {p.product_id ? (
              <span className="flex min-w-0 flex-col">
                <Link to={`/produtos/${p.product_id}`} className="flex min-h-11 items-center truncate font-semibold hover:underline">
                  {p.name}
                </Link>
                <button className="min-h-11 self-start text-xs font-medium text-brand" onClick={() => onProduct(p.product_id!, p.name)}>
                  Filtrar resumo
                </button>
              </span>
            ) : (
              <span className="truncate italic text-ink-soft">{p.name}</span>
            )}
            <span className="amount shrink-0 font-semibold">{value(p)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
