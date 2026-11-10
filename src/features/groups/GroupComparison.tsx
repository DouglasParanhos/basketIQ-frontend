import { useQuery } from "@tanstack/react-query";
import { useId } from "react";
import { api, unwrap, type Schemas } from "../../api/client";
import { ErrorNotice, Spinner } from "../../components/ui";
import { formatCents, formatUnitPrice, plural } from "../../lib/format";
import { merchantName } from "../../lib/merchants";

type Comparison = Schemas["GroupComparisonOut"];

/** The sentence under the chains (D12): a difference only when it is clear; otherwise why there is none. Never which one to choose. */
function verdict(c: Comparison): string {
  switch (c.status) {
    case "clear_difference":
      return `A diferença é de cerca de ${formatCents(c.typical_difference_cents)} numa compra típica.`;
    case "no_clear_difference":
      return "Sem diferença clara entre os supermercados.";
    case "single_chain":
      return `Só comprou em ${merchantName(c.chains[0]?.merchant, c.chains[0]?.merchant_name)} neste período; sem outro supermercado para comparar.`;
    case "not_enough_purchases":
      return `Para comparar, cada supermercado precisa de ${plural(c.needed, "compra", "compras")} neste período.`;
    default:
      return "Sem compras com o tamanho conhecido neste período.";
  }
}

/**
 * Step C (D12) on the product screen: what the person paid for the product's group in each market, by name and never ranked,
 * with the window and the number of purchases. Only the person's own receipts.
 */
export function GroupComparison({ group }: { group: Schemas["GroupRef"] }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="rounded-surface bg-paper p-4 ring-1 ring-inset ring-line">
      <h2 id={id} className="font-bold">
        {group.name}: o que pagou em cada supermercado
      </h2>
      <Body slug={group.slug} />
    </section>
  );
}

function Body({ slug }: { slug: string }) {
  const query = useQuery({
    queryKey: ["group-comparison", slug],
    queryFn: async () => unwrap(await api.GET("/v1/groups/{slug}/comparison", { params: { path: { slug } } })),
  });
  if (query.isLoading) return <Spinner />;
  if (query.error) return <ErrorNotice what="comparar os supermercados" error={query.error} onRetry={() => void query.refetch()} />;
  const c = query.data!;
  return (
    <>
      <p className="mb-2 text-sm text-ink-soft">Preço médio que pagou nos últimos {c.window_days} dias, em todos os produtos deste grupo</p>
      <ul className="flex flex-col">
        {c.chains.map((m) => (
          <li key={`${m.merchant}-${m.merchant_name}`} className="flex items-center justify-between gap-3 border-t border-line py-2 text-sm">
            <span className="min-w-0 font-semibold">{merchantName(m.merchant, m.merchant_name)}</span>
            <span className="text-right">
              <span className="amount font-bold">{formatUnitPrice(m.average_cents, c.basis ?? "")}</span>
              <span className="block text-xs text-ink-soft">{plural(m.purchases, "compra", "compras")}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm">{verdict(c)}</p>
    </>
  );
}
