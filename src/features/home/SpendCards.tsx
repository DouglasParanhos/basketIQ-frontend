import { useId, type ReactNode } from "react";
import { Link } from "react-router";
import type { Schemas } from "../../api/client";
import { DataTable } from "../../components/charts";
import { StatusBadge } from "../../components/ui";
import { formatCents } from "../../lib/format";
import { formatDayMonth, shortMonth } from "../../lib/month";
import { initialsOf } from "../onboarding/state";

type Overview = Schemas["OverviewOut"];

const CARD = "flex flex-col gap-3 rounded-surface bg-paper p-4 ring-1 ring-inset ring-line";
const SMALL_CAPS = "text-[0.6875rem] font-semibold uppercase tracking-widest text-ink-soft";

/** «Compras no mês», next to the average: the confirmed purchases of the month and of the civil month before it. */
export function PurchasesCard({ overview, isCurrentMonth }: { overview: Overview; isCurrentMonth: boolean }) {
  return (
    <section aria-label="Compras no mês" className="flex flex-col gap-1.5 rounded-surface bg-paper p-4 ring-1 ring-inset ring-line">
      <p className={SMALL_CAPS}>Compras no mês</p>
      <p className="amount text-3xl font-extrabold leading-tight">{overview.purchases_this_month}</p>
      <p className="text-xs leading-snug text-ink-soft">
        {isCurrentMonth ? "Mês passado" : "Mês anterior"}: {overview.purchases_last_month}
      </p>
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
      <ol className="flex h-28 items-end gap-2">
        {weeks.map((w) => (
          <li key={w.index} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <span className="amount text-[0.6875rem] text-ink-soft">{formatCents(w.spent_cents)}</span>
            {/* The height only draws the value, which is written above. */}
            <span aria-hidden className="block w-full rounded-md bg-chart" style={{ height: `${Math.max(4, (w.spent_cents / highest) * 100)}%` }} />
            <span className="text-center text-[0.6875rem] leading-tight text-ink-soft">
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

function Merchants({ merchants }: { merchants: Overview["by_merchant"] }) {
  return (
    <Card title="Onde gasta mais">
      {merchants.length === 0 ? (
        <p className="text-sm text-ink-soft">Sem compras confirmadas neste mês.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {merchants.map((m) => (
            <li key={`${m.merchant ?? "outros"}-${m.name}`} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-x-3 gap-y-1 text-sm">
              <span aria-hidden className="grid size-8 place-items-center rounded-control bg-brand-soft text-sm font-extrabold text-brand-deep">
                {initialsOf(m.name)}
              </span>
              <span className="min-w-0 truncate font-semibold">{m.name}</span>
              <span className="amount text-ink-soft">{formatCents(m.spent_cents)}</span>
              <span className="w-11 text-right font-bold">{m.share_pct} %</span>
              <span aria-hidden className="col-span-4 block h-2 overflow-hidden rounded-full bg-ground">
                <span className="block h-full rounded-full bg-chart" style={{ width: `${Math.max(m.share_pct, 1)}%` }} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Recent({ receipts }: { receipts: Overview["recent_receipts"] }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <h2 id={id} className="text-sm font-bold">
          Últimas compras
        </h2>
        <Link to="/compras" className="inline-flex min-h-11 items-center px-1 text-sm font-bold text-brand">
          Ver todas
        </Link>
      </div>
      {receipts.length === 0 ? (
        <p className="text-sm text-ink-soft">Sem compras neste mês.</p>
      ) : (
        <ul className="flex flex-col">
          {receipts.map((r) => (
            <li key={r.id} className="border-t border-line">
              <Link to={`/compras/${r.id}`} className="flex min-h-14 items-center gap-3 py-2">
                <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-control bg-brand-soft text-lg font-extrabold text-brand-deep">
                  {initialsOf(r.name)}
                </span>
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
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** The spending, the stores and the latest purchases of the month. Only confirmed purchases count in the values; the others only show in their own line. */
export function SpendCards({ overview }: { overview: Overview }) {
  return (
    <>
      <Weeks weeks={overview.weeks} />
      <Merchants merchants={overview.by_merchant} />
      <Recent receipts={overview.recent_receipts} />
    </>
  );
}
