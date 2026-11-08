import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Navigate, useSearchParams } from "react-router";
import { api, unwrap } from "../../api/client";
import { RadioPills } from "../../components/RadioPills";
import { Button, ErrorNotice, LinkButton, Notice, Spinner } from "../../components/ui";
import { IN_PROGRESS, type ReceiptStatus } from "../../lib/status";
import { useMonths } from "../taloes/useMonths";
import { useYear } from "../taloes/useYear";
import { groupByMonth, headerSummary, yearOf, type Filter } from "./months";
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

  function change(update: (next: URLSearchParams) => void) {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        update(next);
        return next;
      },
      { replace: true },
    );
  }
  const choose = (id: Filter) => change((next) => (id === "todas" ? next.delete("filtro") : next.set("filtro", id)));

  // The «papel de talão» view is gone (the list is the paper now): its old address opens the list, without the parameter.
  if (params.has("vista")) {
    const next = new URLSearchParams(params);
    next.delete("vista");
    return <Navigate to={{ search: next.toString() }} replace />;
  }

  return (
    <>
      <h2 className="sr-only">Compras</h2>
      <RadioPills
        label="Filtrar compras"
        options={FILTERS.map((f) => ({
          id: f.id,
          label:
            f.id === "acao" && asked > 0 ? (
              <>
                <span aria-hidden className="inline-block size-2 rounded-full bg-marker dark:bg-warn" />
                {f.label} · {asked >= 100 ? "99+" : asked}
              </>
            ) : (
              f.label
            ),
        }))}
        value={filter.id}
        className="mb-4 mt-3"
        onChange={choose}
      />

      {query.isLoading && <Spinner />}
      {query.error && <ErrorNotice what="carregar as compras" error={query.error} onRetry={() => void query.refetch()} />}
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

      {/* One sheet of paper per month, with the month on the desk above it. */}
      {groups.map((g, index) => {
        const first = index === 0;
        const summary = headerSummary(g, months.data, filter.id);
        return (
          <section key={g.key} aria-labelledby={`mes-${g.key}`} className="mb-3">
            <h3 id={`mes-${g.key}`} className="flex items-baseline justify-between gap-3 pb-2 pt-3">
              <span className="font-display text-lg font-semibold">{g.title}</span>
              {summary && (
                <>
                  <span className="sr-only"> · </span>
                  <span className="text-right text-xs font-normal text-ink-soft">{summary}</span>
                </>
              )}
            </h3>
            <div className="torn bg-paper px-4 pb-[30px] shadow-[0_1px_0_var(--color-muted-bar)] [--tear:10px]">
              {/* The label heads the first sheet only, as in the design; the others start with the first row. */}
              {first && (
                <p aria-hidden className="font-receipt border-b border-dashed border-muted-bar pb-2 pt-3 text-center text-[11px] font-semibold tracking-[0.1em] text-ink-soft">
                  OS SEUS TALÕES
                </p>
              )}
              {/* The dashed line is between neighbours (the first sheet's label draws the one above its first row). */}
              <ul className={`flex flex-col divide-y divide-dashed divide-muted-bar ${first ? "" : "pt-1"}`}>
                {g.rows.map((r) => (
                  <ReceiptRow key={r.id} receipt={r} />
                ))}
              </ul>
            </div>
          </section>
        );
      })}
      {query.hasNextPage && (
        <Button variant="secondary" className="mt-4 w-full" busy={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
          Carregar mais
        </Button>
      )}
    </>
  );
}
