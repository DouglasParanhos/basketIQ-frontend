import { Link } from "react-router";
import type { Schemas } from "../../api/client";
import { formatCents } from "../../lib/format";
import { rowState, STATUS } from "../../lib/status";
import { dayMonthSlashOf, monthTotal, receiptName, type Filter, type MonthGroup, type MonthTotal } from "./months";

/** What the row says besides the store: the state in words, never in colour alone («REVER» is marked and spelled out). */
function Mark({ receipt: r }: { receipt: Schemas["ReceiptSummaryOut"] }) {
  const state = rowState(r.status);
  if (state === "attention") {
    return (
      <span className="marker px-0.5 font-semibold">
        <span className="sr-only">Requer ação: </span>REVER
      </span>
    );
  }
  if (state === "error") return <span className="text-ink-soft">{STATUS[r.status].label}</span>;
  return null;
}

function Row({ receipt: r }: { receipt: Schemas["ReceiptSummaryOut"] }) {
  const state = rowState(r.status);
  const total = state === "progress" ? "a ler…" : r.total_cents === null ? "—" : formatCents(r.total_cents);
  return (
    <li>
      <Link to={`/compras/${r.id}`} className="flex min-h-11 items-center gap-2">
        <span className="w-10 shrink-0 text-ink-soft">{dayMonthSlashOf(r)}</span>
        <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
          <span className="font-semibold [overflow-wrap:anywhere]">{receiptName(r).toLocaleUpperCase("pt-PT")}</span>
          <Mark receipt={r} />
        </span>
        <span className="min-w-16 shrink-0 text-right">{total}</span>
      </Link>
    </li>
  );
}

/** The purchases as a printed receipt: month by month, with the confirmed total of the endpoint of totals at the end of each month. */
export function ReceiptPaper({ groups, totals, filter }: { groups: MonthGroup[]; totals: MonthTotal[] | undefined; filter: Filter }) {
  if (groups.length === 0) return null;
  return (
    <section aria-label="Os seus talões em papel de talão" className="receipt-paper">
      <h2 className="text-center font-semibold tracking-[0.08em]">OS SEUS TALÕES</h2>
      {groups.map((g) => {
        const total = monthTotal(g, totals, filter);
        return (
          <div key={g.key} className="mt-3 first-of-type:mt-0">
            <h3 className="text-center font-normal text-ink-soft">{g.title.toLocaleUpperCase("pt-PT")}</h3>
            <hr />
            <ul>
              {g.rows.map((r) => (
                <Row key={r.id} receipt={r} />
              ))}
            </ul>
            {total && (
              <>
                <hr />
                <div className="flex justify-between font-semibold">
                  <span>TOTAL CONFIRMADO</span>
                  <span>{formatCents(total.total_cents)}</span>
                </div>
              </>
            )}
          </div>
        );
      })}
    </section>
  );
}
