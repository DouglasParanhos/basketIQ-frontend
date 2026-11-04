import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router";
import { api, unwrap } from "../../api/client";
import { DataTable, PriceLine } from "../../components/charts";
import { Notice, Spinner } from "../../components/ui";
import { formatCents, formatDate, formatQuantity } from "../../lib/format";
import { merchantName } from "../../lib/merchants";

const BASIS: Record<string, string> = { un: "por unidade", kg: "por kg", l: "por litro" };

export default function ProductPage() {
  const { id = "" } = useParams();
  const query = useQuery({
    queryKey: ["product", id],
    queryFn: async () => unwrap(await api.GET("/v1/products/{product_id}/analytics", { params: { path: { product_id: id } } })),
  });
  if (query.isLoading) return <Spinner />;
  if (query.error) return <Notice tone="error">{query.error.message}</Notice>;
  const a = query.data!;
  const basis = BASIS[a.price_basis] ?? a.price_basis;
  const priced = a.history.filter((h) => h.unit_price_cents !== null && h.price_basis === a.price_basis);
  const points = priced.map((h) => ({
    label: formatDate(h.date),
    short: formatDate(h.date).replace(/ de \d{4}$/, ""),
    cents: h.unit_price_cents!,
    merchant: merchantName(h.merchant),
  }));

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center gap-2 pt-6">
        <Link to="/produtos" aria-label="Voltar aos produtos" className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-brand-soft">
          <ArrowLeft aria-hidden className="size-5" />
        </Link>
        <h1 className="font-display text-2xl font-semibold leading-tight">{a.product.name}</h1>
      </header>

      <section aria-label={`Preço médio ${basis}`} className="flex flex-col gap-1.5 rounded-surface bg-paper p-4 ring-1 ring-inset ring-line">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-ink-soft">Preço médio {basis}</p>
        <p className="amount font-display text-[2.75rem] font-semibold leading-none">{formatCents(a.avg_price_cents)}</p>
        <p className="text-sm text-ink-soft">Média ponderada pelas quantidades que comprou</p>
        <dl className="mt-2 grid grid-cols-3 gap-3 border-t border-line pt-3">
          <div>
            <dt className="text-xs text-ink-soft">Mínimo</dt>
            <dd className="amount font-bold">{formatCents(a.min_price_cents)}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-soft">Máximo</dt>
            <dd className="amount font-bold">{formatCents(a.max_price_cents)}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-soft">Comprou</dt>
            <dd className="font-bold">{formatQuantity(a.total_quantity, a.price_basis)}</dd>
          </div>
        </dl>
        {a.mixed_units && <p className="text-xs text-ink-soft">Algumas compras usam outra unidade e não entram no preço médio.</p>}
      </section>

      <section aria-labelledby="evolucao" className="rounded-surface bg-paper p-4 ring-1 ring-inset ring-line">
        <h2 id="evolucao" className="mb-2 font-bold">
          Evolução do preço
        </h2>
        {a.insufficient_data || points.length < 2 ? (
          <p className="py-6 text-sm text-ink-soft">É preciso comprar este produto mais vezes para ver a evolução do preço.</p>
        ) : (
          <PriceLine points={points} title={`Preço pago ${basis}`} basis={basis} />
        )}
        <DataTable
          caption="Histórico de compras"
          head={["Data", "Mercado", "Descrição original", "Quantidade", "Preço", "Pago"]}
          rows={a.history.map((h) => [
            formatDate(h.date),
            merchantName(h.merchant),
            h.raw_description,
            formatQuantity(h.quantity, h.unit),
            formatCents(h.unit_price_cents),
            formatCents(h.net_cents),
          ])}
        />
      </section>

      <section aria-labelledby="mercados" className="rounded-surface bg-paper p-4 ring-1 ring-inset ring-line">
        <h2 id="mercados" className="font-bold">
          Preço médio que pagou, por mercado
        </h2>
        <p className="mb-2 text-sm text-ink-soft">Nos seus talões</p>
        <ul className="flex flex-col">
          {a.by_merchant.map((m) => (
            <li key={m.merchant} className="flex items-center justify-between gap-3 border-t border-line py-2 text-sm">
              <span className="min-w-0 font-semibold">{merchantName(m.merchant)}</span>
              <span className="text-right">
                <span className="amount font-bold">{formatCents(m.avg_price_cents)}</span>
                <span className="text-ink-soft"> · último {formatCents(m.last_price_cents)}</span>
                <span className="block text-xs text-ink-soft">
                  {m.purchases} {m.purchases === 1 ? "compra" : "compras"}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
