import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronRight, Search } from "lucide-react";
import { useDeferredValue } from "react";
import { Link, useSearchParams } from "react-router";
import { api, unwrap, type Schemas } from "../../api/client";
import { Notice, Spinner } from "../../components/ui";
import { formatCents } from "../../lib/format";
import { ORDERS, parseOrder, sortProducts } from "./sort";

const BASE: Record<string, string> = { kg: "/kg", l: "/l", un: "/un." };

function Price({ product: p }: { product: Schemas["ProductSearchItem"] }) {
  // No average price (no unit or price known): nothing is shown in its place, so none is made up.
  if (p.avg_price_cents === null) {
    return (
      <span className="text-right text-ink-soft">
        <span aria-hidden>—</span>
        <span className="sr-only">sem preço médio</span>
      </span>
    );
  }
  return (
    <span className="text-right">
      <span className="amount block font-bold">
        {formatCents(p.avg_price_cents)} {BASE[p.price_basis] ?? ""}
      </span>
      <span className="block text-[0.6875rem] text-ink-soft">preço médio</span>
    </span>
  );
}

/** The products bought, with the average price and the counts; ordered in the client («Mais comprados» by default). */
export default function ProductsPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const order = parseOrder(params.get("ordem"));
  const deferred = useDeferredValue(q);
  const query = useQuery({
    queryKey: ["products", deferred],
    queryFn: async () => unwrap(await api.GET("/v1/products", { params: { query: { q: deferred || undefined, limit: 100 } } })),
    placeholderData: keepPreviousData,
  });
  const products = query.data ? sortProducts(query.data, order) : [];

  function update(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    setParams(next, { replace: true });
  }

  return (
    <>
      <h2 className="sr-only">Produtos</h2>
      <label className="relative mb-3 mt-3 block">
        <span className="sr-only">Pesquisar produto</span>
        <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-soft" />
        <input
          type="search"
          value={q}
          onChange={(e) => update({ q: e.target.value })}
          placeholder="Pesquisar produto"
          className="min-h-[3.25rem] w-full rounded-full border-[1.5px] border-line bg-paper pl-12 pr-4 text-base"
        />
      </label>
      <div role="radiogroup" aria-label="Ordenar produtos" className="mb-3 flex gap-2 overflow-x-auto">
        {ORDERS.map((o) => (
          <button
            key={o.id}
            role="radio"
            aria-checked={o.id === order}
            onClick={() => update({ ordem: o.id === "compras" ? null : o.id })}
            className="min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold ring-1 ring-inset ring-line aria-checked:bg-brand aria-checked:text-white aria-checked:ring-brand dark:aria-checked:text-ground"
          >
            {o.label}
          </button>
        ))}
      </div>
      {query.isLoading && <Spinner />}
      {query.error && <Notice tone="error">{query.error.message}</Notice>}
      {query.data?.length === 0 && (
        <Notice tone="info">{q ? `Nenhum produto com “${q}” nas compras confirmadas.` : "Os produtos aparecem aqui depois de confirmar compras."}</Notice>
      )}
      <ul className="flex flex-col">
        {products.map((p) => (
          <li key={p.id}>
            <Link to={`/produtos/${p.id}`} className="flex min-h-16 items-center gap-3 border-t border-line py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{p.name}</span>
                <span className="block text-xs text-ink-soft">
                  {p.purchases} {p.purchases === 1 ? "compra" : "compras"} · {p.merchants} {p.merchants === 1 ? "mercado" : "mercados"}
                </span>
              </span>
              <Price product={p} />
              <ChevronRight aria-hidden className="size-[18px] shrink-0 text-ink-soft" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
