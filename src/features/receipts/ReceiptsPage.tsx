import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { api, unwrap } from "../../api/client";
import { Button, LinkButton, Notice, Spinner } from "../../components/ui";
import { IN_PROGRESS, type ReceiptStatus } from "../../lib/status";
import { useMonths } from "../taloes/useMonths";
import { useYear } from "../taloes/useYear";
import { groupByMonth, headerText, yearOf, type Filter } from "./months";
import { ReceiptRow } from "./ReceiptRow";

const ACTION_STATUSES: ReceiptStatus[] = ["REVIEW_REQUIRED", "COMPLETED", "RECEIVED", "INVALID_FORMAT", "UNREADABLE", "UNSUPPORTED_MERCHANT", "TEMPORARY_FAILURE", "PERMANENT_FAILURE"];
const FILTERS: { id: Filter; label: string; status?: ReceiptStatus[] }[] = [
  { id: "todas", label: "Todas" },
  { id: "acao", label: "Requer ação", status: ACTION_STATUSES },
  { id: "confirmadas", label: "Confirmadas", status: ["CONFIRMED"] },
];

/** The purchases by month of the purchase, with the totals of the endpoint of months; the year filters what is loaded («Carregar mais» reaches further back). */
export function ReceiptsPage() {
  const [params, setParams] = useSearchParams();
  const filter = FILTERS.find((f) => f.id === params.get("filtro")) ?? FILTERS[0]!;
  const { year } = useYear();
  const months = useMonths();
  const query = useInfiniteQuery({
    queryKey: ["receipts", filter.id],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) =>
      unwrap(await api.GET("/v1/receipts", { params: { query: { limit: 20, cursor: pageParam ?? undefined, status: filter.status } } })),
    getNextPageParam: (last) => last.next_cursor,
    // Keep polling while something is still being processed.
    refetchInterval: (q) => (q.state.data?.pages.some((p) => p.items.some((r) => IN_PROGRESS.has(r.status))) ? 3000 : false),
  });
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const reading = items.some((r) => IN_PROGRESS.has(r.status));

  // How many purchases ask for action (the API has no counter): one request for up to 100, refreshed with the list.
  const counter = useQuery({
    queryKey: ["receipts", "action-count"],
    queryFn: async () => unwrap(await api.GET("/v1/receipts", { params: { query: { limit: 100, status: ACTION_STATUSES } } })),
    refetchInterval: reading ? 3000 : false,
  });
  const asked = counter.data?.items.length ?? 0;

  // «Requer ação» shows every year (its number is for every year); the other filters show the year chosen.
  const visible = filter.id === "acao" ? items : items.filter((r) => yearOf(r) === year);
  const groups = groupByMonth(visible);
  const notReached = filter.id !== "acao" && items.length > 0 && visible.length === 0 && query.hasNextPage;

  function choose(id: Filter) {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (id === "todas") next.delete("filtro");
        else next.set("filtro", id);
        return next;
      },
      { replace: true },
    );
  }

  return (
    <>
      <h2 className="sr-only">Compras</h2>
      <div role="radiogroup" aria-label="Filtrar compras" className="mb-4 mt-3 flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            role="radio"
            aria-checked={f.id === filter.id}
            onClick={() => choose(f.id)}
            className="min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold ring-1 ring-inset ring-line aria-checked:bg-brand aria-checked:text-white aria-checked:ring-brand dark:aria-checked:text-ground"
          >
            {f.id === "acao" && asked > 0 ? `${f.label} · ${asked >= 100 ? "99+" : asked}` : f.label}
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
      {notReached && <Notice tone="info">Ainda não chegou a este ano.</Notice>}
      {!query.isLoading && items.length > 0 && visible.length === 0 && !notReached && (
        <Notice tone="info" title="Nada nesta lista">
          Não há compras neste ano.
        </Notice>
      )}

      {groups.map((g) => (
        <section key={g.key} aria-labelledby={`mes-${g.key}`} className="mb-2">
          <h3 id={`mes-${g.key}`} className="pb-1 pt-3 text-sm font-bold">
            {headerText(g, months.data, filter.id)}
          </h3>
          <ul className="flex flex-col">
            {g.rows.map((r) => (
              <ReceiptRow key={r.id} receipt={r} />
            ))}
          </ul>
        </section>
      ))}
      {query.hasNextPage && (
        <Button variant="secondary" className="mt-4 w-full" busy={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
          Carregar mais
        </Button>
      )}
    </>
  );
}
