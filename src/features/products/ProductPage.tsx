import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router";
import { api, unwrap } from "../../api/client";
import { DataTable, PriceLine } from "../../components/charts";
import { Notice, Spinner } from "../../components/ui";
import { formatCents, formatDate, formatQuantity, merchantName } from "../../lib/format";

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
    <div className="flex flex-col gap-5">
      <header className="flex items-center gap-3 pt-6">
        <Link to="/produtos" aria-label="Voltar aos produtos" className="grid size-11 place-items-center rounded-full hover:bg-brand-soft">
          <ArrowLeft aria-hidden className="size-5" />
        </Link>
        <h1 className="text-2xl font-extrabold leading-tight tracking-tight">{a.product.name}</h1>
      </header>

      <section aria-label="Resumo do produto">
        <p className="text-sm text-ink-soft">Preço médio {basis}</p>
        <p className="amount text-[2.75rem] font-extrabold leading-none tracking-tight">{formatCents(a.avg_price_cents)}</p>
        <p className="mt-2 text-sm text-ink-soft">
          Média ponderada pela quantidade comprada. Entre {formatCents(a.min_price_cents)} e {formatCents(a.max_price_cents)}.
        </p>
        <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4">
          <div>
            <dt className="text-xs text-ink-soft">Quantidade</dt>
            <dd className="text-xl font-bold">{formatQuantity(a.total_quantity, a.price_basis)}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-soft">Gasto</dt>
            <dd className="text-xl font-bold">{formatCents(a.total_spent_cents)}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-soft">Compras</dt>
            <dd className="text-xl font-bold">{a.purchases}</dd>
          </div>
        </dl>
        {a.mixed_units && (
          <p className="mt-3 text-xs text-ink-soft">Algumas compras usam outra unidade e não entram no preço médio.</p>
        )}
      </section>

      <section aria-labelledby="historico" className="rounded-surface bg-paper p-4">
        <h2 id="historico" className="mb-2 font-bold">
          Preço pago {basis}
        </h2>
        {a.insufficient_data || points.length < 2 ? (
          <p className="py-6 text-sm text-ink-soft">É preciso comprar este produto mais vezes para ver a evolução do preço.</p>
        ) : (
          <PriceLine points={points} title={`Preço pago ${basis}`} basis={basis} />
        )}
        <DataTable
          caption="Histórico de compras"
          head={["Data", "Supermercado", "Quantidade", "Preço", "Pago"]}
          rows={a.history.map((h) => [
            formatDate(h.date),
            merchantName(h.merchant),
            formatQuantity(h.quantity, h.unit),
            formatCents(h.unit_price_cents),
            formatCents(h.net_cents),
          ])}
        />
      </section>

      <section aria-labelledby="comparar" className="rounded-surface bg-paper p-4">
        <h2 id="comparar" className="mb-3 font-bold">
          Comparar supermercados
        </h2>
        <table className="w-full text-sm">
          <caption className="sr-only">Preço {basis} por supermercado</caption>
          <thead>
            <tr className="text-ink-soft">
              <th scope="col" className="py-1 text-left font-semibold">
                Supermercado
              </th>
              <th scope="col" className="py-1 text-right font-semibold">
                Médio
              </th>
              <th scope="col" className="py-1 text-right font-semibold">
                Último
              </th>
            </tr>
          </thead>
          <tbody>
            {a.by_merchant.map((m) => (
              <tr key={m.merchant} className="border-t border-line">
                <th scope="row" className="py-2 text-left font-semibold">
                  {merchantName(m.merchant)}
                  <span className="block text-xs font-normal text-ink-soft">
                    {m.purchases} {m.purchases === 1 ? "compra" : "compras"}
                  </span>
                </th>
                <td className="py-2 text-right">{formatCents(m.avg_price_cents)}</td>
                <td className="py-2 text-right">
                  {formatCents(m.last_price_cents)}
                  <span className="block text-xs text-ink-soft">{formatDate(m.last_date)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
