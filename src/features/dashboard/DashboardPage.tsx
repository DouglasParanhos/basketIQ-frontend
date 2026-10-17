import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { api, unwrap, type Merchant, type Schemas } from "../../api/client";
import { DataTable, SpendBars, type Point } from "../../components/charts";
import { LinkButton, Notice, Select, Spinner } from "../../components/ui";
import { formatCents, formatMonth, formatVariation, merchantName, MERCHANT_NAMES } from "../../lib/format";
import { describePeriod, lisbonToday, periodFor, type Period, type PeriodKind } from "../../lib/period";
import { useMe } from "../auth/session";
import { PeriodPicker } from "./PeriodPicker";

type Summary = Schemas["SummaryOut"];

const dayShort = new Intl.DateTimeFormat("pt-PT", { day: "numeric", timeZone: "UTC" });
const dayLong = new Intl.DateTimeFormat("pt-PT", { weekday: "short", day: "numeric", month: "long", timeZone: "UTC" });
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

export function DashboardPage() {
  const { data: me } = useMe();
  const { period, merchant, product, update } = usePeriodParams();
  const query = useQuery({
    queryKey: ["summary", period.from, period.to, merchant, product?.id],
    queryFn: async () =>
      unwrap(
        await api.GET("/v1/analytics/summary", {
          params: {
            query: {
              from: period.from,
              to: period.to,
              merchant: (merchant ?? undefined) as Merchant | undefined,
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

  const firstName = me?.display_name?.split(" ")[0];
  const s = query.data;

  return (
    <div className="flex flex-col gap-5 pt-6">
      <h1 className="sr-only">Resumo</h1>
      <p className="text-ink-soft">{firstName ? `Olá, ${firstName}.` : "Olá."}</p>

      {anyReceipts.data && anyReceipts.data.items.length === 0 ? (
        <section className="flex flex-col items-start gap-4 rounded-surface bg-paper p-6">
          <h2 className="text-2xl font-extrabold leading-tight">Comece pela primeira nota</h2>
          <p className="text-ink-soft">
            Fotografe a nota do supermercado ou envie a fatura em PDF. Assim que for lida, aparece aqui quanto gastou, onde e em quê.
          </p>
          <LinkButton to="/adicionar">Adicionar a primeira nota</LinkButton>
        </section>
      ) : (
        <>
          <PeriodPicker
            value={period}
            onChange={(p) => update({ periodo: p.kind === "month" ? null : p.kind, de: p.from, ate: p.to })}
          />
          <div className="flex flex-wrap items-end gap-3">
            <Select
              label="Supermercado"
              value={merchant ?? ""}
              onChange={(e) => update({ mercado: e.target.value || null })}
              className="min-w-44 flex-1"
            >
              <option value="">Todos</option>
              {Object.entries(MERCHANT_NAMES)
                .filter(([c]) => c !== "UNKNOWN")
                .map(([code, name]) => (
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
          {query.error && <Notice tone="error">{query.error.message}</Notice>}
          {s && <SummaryView summary={s} period={period} onProduct={(id, name) => update({ produto: id, produto_nome: name })} stale={query.isPlaceholderData} />}
        </>
      )}
    </div>
  );
}

function SummaryView({
  summary: s,
  period,
  onProduct,
  stale,
}: {
  summary: Summary;
  period: Period;
  onProduct: (id: string, name: string) => void;
  stale: boolean;
}) {
  const variation = formatVariation(s.cards.variation_pct.total_spent);
  const previousLabel = describePeriod({ kind: period.kind, from: s.cards.previous_period.from, to: s.cards.previous_period.to });
  if (s.empty) {
    return (
      <Notice tone="info" title="Sem compras neste período" action={<LinkButton to="/adicionar" variant="secondary">Adicionar nota</LinkButton>}>
        Escolha outro período ou adicione uma nota desta altura.
      </Notice>
    );
  }
  const pts = points(s);
  return (
    <div className={`flex flex-col gap-5 transition-opacity ${stale ? "opacity-60" : ""}`} aria-busy={stale}>
      <section aria-labelledby="gasto">
        <h2 id="gasto" className="text-sm font-medium text-ink-soft">
          Gasto total
        </h2>
        <p className="amount text-[3.25rem] font-extrabold leading-none tracking-tight">{formatCents(s.cards.total_spent_cents)}</p>
        <p className="mt-2 text-sm text-ink-soft">
          {variation ? `${variation} face a ${previousLabel} (${formatCents(s.cards.previous_period.total_spent_cents)})` : `Sem compras em ${previousLabel} para comparar.`}
        </p>
        <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4">
          <div>
            <dt className="text-xs text-ink-soft">Compras</dt>
            <dd className="text-xl font-bold">{s.cards.purchases}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-soft">Unidades</dt>
            <dd className="text-xl font-bold">{s.cards.units.replace(".", ",")}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-soft">Preço médio por unidade</dt>
            <dd className="text-xl font-bold">{formatCents(s.cards.avg_price_per_unit_cents)}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="evolucao" className="rounded-surface bg-paper p-4">
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

      <section aria-labelledby="mercados" className="rounded-surface bg-paper p-4">
        <h2 id="mercados" className="mb-3 font-bold">
          Por supermercado
        </h2>
        <ul className="flex flex-col gap-3">
          {s.by_merchant.map((m) => (
            <li key={m.merchant}>
              <div className="flex justify-between text-sm">
                <span className="font-semibold">{merchantName(m.merchant)}</span>
                <span>
                  {formatCents(m.spent_cents)} <span className="text-ink-soft">({m.share_pct.toLocaleString("pt-PT")} %)</span>
                </span>
              </div>
              <div aria-hidden className="mt-1 h-2 rounded-full bg-ground">
                <div className="h-2 rounded-full bg-[var(--color-chart)]" style={{ width: `${Math.max(m.share_pct, 1)}%` }} />
              </div>
              <p className="text-xs text-ink-soft">
                {m.purchases} {m.purchases === 1 ? "compra" : "compras"}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <Ranking title="Mais gasto" items={s.top_products_by_value} value={(p) => formatCents(p.spent_cents)} onProduct={onProduct} />
        <Ranking title="Mais comprados" items={s.top_products_by_quantity} value={(p) => `${p.units.replace(".", ",")} un.`} onProduct={onProduct} />
      </div>
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
    <section className="rounded-surface bg-paper p-4">
      <h2 className="mb-2 font-bold">{title}</h2>
      <ol className="flex flex-col">
        {items.slice(0, 5).map((p) => (
          <li key={p.product_id ?? p.name} className="flex items-center justify-between gap-3 border-b border-line py-2 text-sm last:border-0">
            {p.product_id ? (
              <span className="flex min-w-0 flex-col">
                <Link to={`/produtos/${p.product_id}`} className="flex min-h-7 items-center truncate font-semibold hover:underline">
                  {p.name}
                </Link>
                <button className="min-h-7 self-start text-xs font-medium text-brand" onClick={() => onProduct(p.product_id!, p.name)}>
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
