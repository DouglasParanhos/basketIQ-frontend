import { AlertCircle } from "lucide-react";
import { Link } from "react-router";
import type { Schemas } from "../../api/client";
import { MarketTile } from "../../components/MarketBadge";
import { formatCents } from "../../lib/format";
import { rowState, STATUS } from "../../lib/status";
import { dayMonthOf, receiptName } from "./months";

const BADGE = {
  attention: { style: "bg-marker text-marker-ink", content: "!" },
  progress: { style: "bg-line text-ink", content: "…" },
  error: { style: "bg-alert-soft text-alert", content: <AlertCircle className="size-3.5" /> },
};

/** The badge on the corner of the initial of the store: always with a word next to it, never the only sign. */
function Badge({ state }: { state: keyof typeof BADGE }) {
  const { style, content } = BADGE[state];
  return (
    <span aria-hidden className={`absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full border-2 border-ground text-xs font-extrabold ${style}`}>
      {content}
    </span>
  );
}

/** One purchase of the list: the store, the day, the items and the state in words, and the total. The state comes from `status`. */
export function ReceiptRow({ receipt: r }: { receipt: Schemas["ReceiptSummaryOut"] }) {
  const state = rowState(r.status);
  const name = receiptName(r);
  const day = dayMonthOf(r);
  const items = r.line_count > 0 ? `${r.line_count} ${r.line_count === 1 ? "item" : "itens"}` : null;
  return (
    <li>
      <Link to={`/compras/${r.id}`} className="flex min-h-16 items-center gap-3 border-t border-line py-2.5">
        <span className="relative shrink-0">
          <MarketTile code={r.merchant} size={40} fontSize={18} />
          {state !== "confirmed" && <Badge state={state} />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-semibold">{name}</span>
          {r.store_label && <span className="truncate text-xs text-ink-soft">{r.store_label}</span>}
          <span className={`text-xs ${state === "attention" ? "font-semibold text-warn-ink" : "text-ink-soft"}`}>
            <span className={state === "attention" ? "font-bold" : undefined}>{day}</span>
            {state === "progress" && " · a ler o talão…"}
            {state === "error" && <> · {STATUS[r.status].label}</>}
            {state !== "progress" && state !== "error" && items && ` · ${items}`}
            {state === "attention" && (
              <>
                {" · "}
                <span>
                  <span className="sr-only">Requer ação: </span>rever valores
                </span>
              </>
            )}
          </span>
        </span>
        <span className="amount shrink-0 font-bold">{state === "progress" || r.total_cents === null ? "—" : formatCents(r.total_cents)}</span>
      </Link>
    </li>
  );
}
