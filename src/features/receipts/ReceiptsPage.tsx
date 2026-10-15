import { useInfiniteQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { api, unwrap, type Schemas } from "../../api/client";
import { Button, LinkButton, Notice, PageHeader, Spinner, StatusBadge } from "../../components/ui";
import { formatCents, formatDate, formatDateTime, merchantName } from "../../lib/format";
import { IN_PROGRESS, type ReceiptStatus } from "../../lib/status";

const FILTERS: { id: string; label: string; status?: ReceiptStatus[] }[] = [
  { id: "todas", label: "Todas" },
  {
    id: "acao",
    label: "Requer ação",
    status: ["REVIEW_REQUIRED", "COMPLETED", "RECEIVED", "INVALID_FORMAT", "UNREADABLE", "UNSUPPORTED_MERCHANT", "TEMPORARY_FAILURE", "PERMANENT_FAILURE"],
  },
  { id: "confirmadas", label: "Confirmadas", status: ["CONFIRMED"] },
];

export function ReceiptsPage() {
  const [params, setParams] = useSearchParams();
  const filter = FILTERS.find((f) => f.id === params.get("filtro")) ?? FILTERS[0]!;
  const query = useInfiniteQuery({
    queryKey: ["receipts", filter.id],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) =>
      unwrap(
        await api.GET("/v1/receipts", {
          params: { query: { limit: 20, cursor: pageParam ?? undefined, status: filter.status } },
        }),
      ),
    getNextPageParam: (last) => last.next_cursor,
    // Keep polling while something is still being processed.
    refetchInterval: (q) =>
      q.state.data?.pages.some((p) => p.items.some((r) => IN_PROGRESS.has(r.status))) ? 3000 : false,
  });
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <>
      <PageHeader title="Compras">
        <LinkButton to="/produtos" variant="quiet">
          Produtos
        </LinkButton>
      </PageHeader>
      <div role="radiogroup" aria-label="Filtrar compras" className="mb-4 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            role="radio"
            aria-checked={f.id === filter.id}
            onClick={() => setParams(f.id === "todas" ? {} : { filtro: f.id })}
            className="min-h-11 rounded-full px-4 text-sm font-semibold ring-1 ring-inset ring-line aria-checked:bg-cobalt aria-checked:text-white aria-checked:ring-cobalt dark:aria-checked:text-ground"
          >
            {f.label}
          </button>
        ))}
      </div>

      {query.isLoading && <Spinner />}
      {query.error && <Notice tone="error">{query.error.message}</Notice>}
      {!query.isLoading && items.length === 0 && (
        <Notice
          tone="info"
          title={filter.id === "todas" ? "Ainda não há compras" : "Nada nesta lista"}
          action={filter.id === "todas" && <LinkButton to="/adicionar">Adicionar a primeira nota</LinkButton>}
        >
          {filter.id === "todas" ? "Fotografe uma nota ou envie o PDF da fatura para começar." : "Não há compras com este estado."}
        </Notice>
      )}

      <ul className="flex flex-col gap-2">
        {items.map((r) => (
          <ReceiptRow key={r.id} receipt={r} />
        ))}
      </ul>
      {query.hasNextPage && (
        <Button variant="secondary" className="mt-4 w-full" busy={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
          Carregar mais
        </Button>
      )}
    </>
  );
}

function ReceiptRow({ receipt: r }: { receipt: Schemas["ReceiptSummaryOut"] }) {
  return (
    <li>
      <Link to={`/compras/${r.id}`} className="flex items-center gap-3 rounded-surface bg-paper p-4 hover:ring-1 hover:ring-cobalt">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate font-bold">{r.merchant ? merchantName(r.merchant) : "Nota em processamento"}</span>
            <span className="amount shrink-0 font-bold">{formatCents(r.total_cents)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-sm text-ink-soft">
            <span>{r.purchase_at ? formatDate(r.purchase_at) : `Enviada ${formatDateTime(r.created_at)}`}</span>
            <StatusBadge status={r.status} />
          </div>
        </div>
        <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-soft" />
      </Link>
    </li>
  );
}
