import { PriceLine, type PricePoint } from "../../components/charts";
import { ErrorNotice, Spinner } from "../../components/ui";
import { formatDate, formatQuantity } from "../../lib/format";
import { merchantName, merchantStyle } from "../../lib/merchants";
import { formatDayMonth } from "../../lib/month";
import { NoInfoStamp } from "../../components/NoInfoStamp";
import { priceText } from "./listFormat";
import { useEvolution } from "./useShoppingList";

/** The chart shows the last six months; when there is no purchase in them, the server sends the older ones. */
const MONTHS = 6;

function Figure({ label, cents, basis }: { label: string; cents: number | null | undefined; basis: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-soft">{label}</dt>
      <dd className="amount font-bold">{priceText(cents, basis)}</dd>
    </div>
  );
}

/** G2: what was paid for an item over time, under the item, without leaving the list. */
export function PriceEvolution({ itemId, panelId }: { itemId: string; panelId: string }) {
  const query = useEvolution(itemId, MONTHS);

  if (query.isLoading) return <Spinner label="A carregar a evolução…" />;
  if (query.error) return <ErrorNotice what="carregar a evolução" error={query.error} onRetry={() => void query.refetch()} />;
  const e = query.data!;
  if (!e.has_history || !e.price_basis) {
    return (
      <div id={panelId} className="px-1 pb-3">
        <NoInfoStamp />
      </div>
    );
  }
  const basis = e.price_basis;
  const points = e.points.map((p) => ({ ...p, store: merchantName(p.merchant, p.merchant_name) }));
  const chart: PricePoint[] = points.map((p) => ({
    label: `${formatDate(p.date)} · ${p.store}`,
    short: formatDayMonth(p.date),
    cents: p.price_cents,
    merchant: p.store,
    color: merchantStyle(p.merchant).bar,
    origin: p.origin,
  }));
  const stores = [...new Map(e.points.map((p) => [p.merchant_name, p.merchant])).entries()];

  return (
    <div id={panelId} className="mb-3 rounded-surface bg-paper p-4 ring-1 ring-inset ring-line">
      <h3 className="font-bold">Evolução do preço</h3>
      <dl className="mt-3 grid grid-cols-4 gap-2 text-sm">
        <Figure label="Esperado" cents={e.expected?.price_cents} basis={basis} />
        <Figure label="Última vez" cents={e.last_cents} basis={basis} />
        <Figure label="Menor" cents={e.min_cents} basis={basis} />
        <Figure label="Maior" cents={e.max_cents} basis={basis} />
      </dl>
      {chart.length >= 2 && (
        <div className="mt-3">
          <PriceLine points={chart} title="Preço pago por compra" basis={basis === "un" ? "" : `/${basis}`} />
        </div>
      )}
      <ul aria-label="Legenda" className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
        {stores.map(([name, code]) => (
          <li key={name} className="flex items-center gap-1.5">
            <span aria-hidden className="size-3 rounded-full ring-2 ring-paper" style={{ background: merchantStyle(code).bar }} />
            Suas compras · {merchantName(code, name)}
          </li>
        ))}
      </ul>
      <h4 className="mt-3 text-sm font-bold">Compras</h4>
      <ul className="text-sm">
        {[...points].reverse().map((p, i) => (
          <li key={`${p.date}-${i}`} className="flex items-baseline justify-between gap-3 border-t border-line py-1.5">
            <span>
              {formatDate(p.date)} · {p.store}
              {p.quantity && <span className="text-xs text-ink-soft"> · {formatQuantity(p.quantity)}</span>}
            </span>
            <span className="amount font-semibold">{priceText(p.price_cents, basis)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
