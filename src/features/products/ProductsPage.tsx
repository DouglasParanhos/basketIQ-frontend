import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useDeferredValue } from "react";
import { Link, useSearchParams } from "react-router";
import { api, unwrap } from "../../api/client";
import { Notice, PageHeader, Spinner } from "../../components/ui";
import { formatCents, formatDate } from "../../lib/format";

export default function ProductsPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const deferred = useDeferredValue(q);
  const query = useQuery({
    queryKey: ["products", deferred],
    queryFn: async () => unwrap(await api.GET("/v1/products", { params: { query: { q: deferred || undefined, limit: 50 } } })),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader title="Produtos" />
      <label className="relative mb-4 block">
        <span className="sr-only">Pesquisar produto</span>
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-ink-soft" />
        <input
          type="search"
          value={q}
          onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })}
          placeholder="Pesquisar, por exemplo leite"
          className="min-h-12 w-full rounded-control border border-line bg-paper pl-11 pr-3 text-base"
        />
      </label>
      {query.isLoading && <Spinner />}
      {query.error && <Notice tone="error">{query.error.message}</Notice>}
      {query.data?.length === 0 && (
        <Notice tone="info">{q ? `Nenhum produto com “${q}” nas compras confirmadas.` : "Os produtos aparecem aqui depois de confirmar compras."}</Notice>
      )}
      <ul className="flex flex-col gap-2">
        {query.data?.map((p) => (
          <li key={p.id}>
            <Link to={`/produtos/${p.id}`} className="flex items-center justify-between gap-3 rounded-surface bg-paper p-4 hover:ring-1 hover:ring-brand">
              <span className="min-w-0">
                <span className="block truncate font-semibold">{p.name}</span>
                <span className="text-sm text-ink-soft">
                  {p.lines} {p.lines === 1 ? "compra" : "compras"}, última a {formatDate(p.last_purchase_at)}
                </span>
              </span>
              <span className="shrink-0 font-bold">{formatCents(p.spent_cents)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
