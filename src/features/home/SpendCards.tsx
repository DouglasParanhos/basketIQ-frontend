import { Users } from "lucide-react";
import { useId, type ReactNode } from "react";
import { Link } from "react-router";
import type { Schemas } from "../../api/client";
import { DataTable } from "../../components/charts";
import { MarketSegment, MarketTile } from "../../components/MarketBadge";
import { SMALL_CAPS, StatusBadge } from "../../components/ui";
import { formatCents, formatPercent } from "../../lib/format";
import { formatDayMonth, shortMonth } from "../../lib/month";

type Overview = Schemas["OverviewOut"];

const CARD = "flex flex-col gap-3 rounded-surface bg-paper p-4 ring-1 ring-inset ring-line";

/** «Compras no mês», next to the average: the confirmed purchases of the month and of the civil month before it. */
export function PurchasesCard({ overview, isCurrentMonth }: { overview: Overview; isCurrentMonth: boolean }) {
  return (
    <section aria-label="Compras no mês" className="flex flex-col gap-1.5 rounded-surface bg-paper p-4 ring-1 ring-inset ring-line">
      <p className={SMALL_CAPS}>Compras no mês</p>
      <p className="amount font-display text-3xl font-semibold leading-[1.1]">{overview.purchases_this_month}</p>
      <p className="text-xs leading-snug text-ink-soft">
        {isCurrentMonth ? "Mês passado" : "Mês anterior"}: {overview.purchases_last_month}
      </p>
    </section>
  );
}

/** «Por pessoa no mês»: the month's spending shared by the people of the house. The division is the client's (the API has no such figure). */
export function PerPersonCard({ spentCents, people }: { spentCents: number; people: number }) {
  return (
    <section aria-label="Por pessoa no mês" className="flex items-center gap-3 rounded-surface bg-paper px-4 py-3.5 ring-1 ring-inset ring-line">
      <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
        <Users className="size-[22px]" strokeWidth={1.9} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={SMALL_CAPS}>Por pessoa no mês</p>
        <p className="text-xs text-ink-soft">
          {people} {people === 1 ? "pessoa" : "pessoas"} em casa
        </p>
      </div>
      <p className="amount font-display text-[length:calc(1.625rem_*_var(--text-scale))] font-semibold">{formatCents(Math.round(spentCents / people))}</p>
    </section>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={CARD}>
      <h2 id={id} className="text-sm font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** «1–7 out.»: the weeks are blocks of days inside one month. */
function weekRange(from: string, to: string): string {
  return `${Number(from.slice(8))}–${Number(to.slice(8))} ${shortMonth(Number(from.slice(5, 7)))}`;
}

function Weeks({ weeks }: { weeks: Overview["weeks"] }) {
  const highest = Math.max(1, ...weeks.map((w) => w.spent_cents));
  return (
    <Card title="Gasto por semana">
      <ol className="flex h-[104px] items-end gap-3">
        {weeks.map((w, i) => (
          <li key={w.index} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <span className="amount text-xs font-bold">{formatCents(w.spent_cents)}</span>
            {/* The height only draws the value, which is written above. */}
            <span aria-hidden className={`block w-full rounded-lg ${i === weeks.length - 1 ? "bg-chart" : "bg-muted-bar"}`} style={{ height: `${Math.max(4, (w.spent_cents / highest) * 100)}%` }} />
            <span className="text-center text-[length:calc(0.6875rem_*_var(--text-scale))] leading-tight text-ink-soft">
              <span className="block font-semibold">Sem. {w.index}</span>
              <span className="block">{weekRange(w.from, w.to)}</span>
            </span>
          </li>
        ))}
      </ol>
      <DataTable
        caption="Gasto por semana"
        head={["Semana", "Gasto"]}
        rows={weeks.map((w) => [`Sem. ${w.index} (${weekRange(w.from, w.to)})`, formatCents(w.spent_cents)])}
      />
    </Card>
  );
}

const merchantKey = (m: Overview["by_merchant"][number]) => `${m.merchant ?? "outros"}-${m.name}`;

function Merchants({ merchants }: { merchants: Overview["by_merchant"] }) {
  return (
    <Card title="Onde gasta mais">
      {merchants.length === 0 ? (
        <p className="text-sm text-ink-soft">Sem compras confirmadas neste mês.</p>
      ) : (
        <>
          {/* One bar split by store; the legend below says each name, value and share in words. */}
          <div aria-hidden className="flex h-[26px] gap-0.5 overflow-hidden rounded-[9px]">
            {merchants.map((m) => (
              <MarketSegment key={merchantKey(m)} code={m.merchant} share={m.share_pct} />
            ))}
          </div>
          <ul className="flex flex-col gap-3">
            {merchants.map((m) => (
              <li key={merchantKey(m)} className="flex items-center gap-2.5 text-sm">
                <MarketTile code={m.merchant} size={20} fontSize={11} />
                <span className="min-w-0 flex-1 truncate font-medium">{m.name}</span>
                <span className="amount text-ink-soft">{formatCents(m.spent_cents)}</span>
                <span className="w-10 text-right font-bold">{formatPercent(m.share_pct)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

/** `example`: the rows are not links (the receipts of the example do not exist) and «Ver todas» is not offered. */
function Recent({ receipts, example }: { receipts: Overview["recent_receipts"]; example: boolean }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <h2 id={id} className="text-sm font-bold">
          Últimas compras
        </h2>
        {!example && (
          <Link to="/compras" className="inline-flex min-h-11 items-center px-1 text-[length:calc(13px_*_var(--text-scale))] font-bold text-brand">
            Ver todas
          </Link>
        )}
      </div>
      {receipts.length === 0 ? (
        <p className="text-sm text-ink-soft">Sem compras neste mês.</p>
      ) : (
        <ul className="flex flex-col">
          {receipts.map((r) => {
            const row = (
              <>
                <MarketTile code={r.merchant} size={40} fontSize={18} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-semibold">{r.name}</span>
                  <span className="text-xs text-ink-soft">{formatDayMonth(r.date)}</span>
                  {r.status !== "CONFIRMED" && (
                    <span className="mt-0.5 self-start">
                      <StatusBadge status={r.status} />
                    </span>
                  )}
                </span>
                <span className="amount shrink-0 font-bold">{r.total_cents === null ? "—" : formatCents(r.total_cents)}</span>
              </>
            );
            return (
              <li key={r.id} className="border-t border-line">
                {example ? (
                  <div className="flex min-h-14 items-center gap-3 py-2">{row}</div>
                ) : (
                  <Link to={`/compras/${r.id}`} className="flex min-h-14 items-center gap-3 py-2">
                    {row}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** The spending, the stores and the latest purchases of the month. Only confirmed purchases count in the values; the others only show in their own line. */
export function SpendCards({ overview, example = false, between }: { overview: Overview; example?: boolean; between?: ReactNode }) {
  return (
    <>
      <Weeks weeks={overview.weeks} />
      <Merchants merchants={overview.by_merchant} />
      {between}
      <Recent receipts={overview.recent_receipts} example={example} />
    </>
  );
}
