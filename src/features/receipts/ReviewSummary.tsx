import { ChevronDown, Pencil } from "lucide-react";
import { useState, type ReactNode } from "react";
import { MarketTile } from "../../components/MarketBadge";
import { Field } from "../../components/ui";
import { formatCents } from "../../lib/format";
import { MERCHANT_CHOICES } from "../../lib/merchants";
import { formatDayMonth } from "../../lib/month";

interface Props {
  merchant: string;
  onMerchant: (value: string) => void;
  storeName: string;
  onStoreName: (value: string) => void;
  date: string;
  time: string;
  onDate: (value: string) => void;
  onTime: (value: string) => void;
  printedText: string;
  printed: number | null;
  printedInvalid: boolean;
  onPrinted: (value: string) => void;
  /** True while the person has a field open (the date or the total): the keyboard needs the room. */
  onEditing: (editing: boolean) => void;
}

/** «28 out. 2026, 18:42», as in the design (the Intl date with a short month would read «28/10/2026»); null while the date is not a date. */
function whenText(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return `${formatDayMonth(date)} ${date.slice(0, 4)}, ${time || "12:00"}`;
}

const ROW = "flex min-h-14 items-center gap-3 border-t border-line first:border-t-0";
const LABEL = "w-16 shrink-0 text-xs text-ink-soft";

function EditButton({ what, open, controls, onClick }: { what: string; open: boolean; controls: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={`Editar ${what}`} aria-expanded={open} aria-controls={controls} onClick={onClick} className="grid size-11 shrink-0 place-items-center text-ink-soft">
      <Pencil aria-hidden className="size-[18px]" />
    </button>
  );
}

function Editing({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div id={id} className="flex flex-col gap-3 pb-3">
      {children}
    </div>
  );
}

/** The card of the review: the store, the date and the total as the purchase is read, each with a pencil that opens its field. */
export function ReviewSummary(p: Props) {
  // A date that is missing is the first thing to fill in: its fields start open.
  const [open, setOpen] = useState<"date" | "total" | null>(p.date === "" ? "date" : null);
  // Only a field the person opens takes the foot away: the date that opens by itself must not arrive without «Confirmar talão».
  const toggle = (which: "date" | "total") => {
    const next = open === which ? null : which;
    setOpen(next);
    p.onEditing(next !== null);
  };
  const when = whenText(p.date, p.time);

  return (
    <section aria-label="Resumo da compra" className="rounded-surface bg-paper px-4 py-1 ring-1 ring-inset ring-line">
      <div className={ROW}>
        <span className={LABEL}>Mercado</span>
        <MarketTile code={p.merchant} size={32} fontSize={14} />
        <div className="relative flex min-w-0 flex-1 items-center">
          <select
            aria-label="Mercado"
            value={p.merchant}
            onChange={(e) => p.onMerchant(e.target.value)}
            className="min-h-11 w-full appearance-none bg-transparent pr-7 text-[15px] font-bold"
          >
            {MERCHANT_CHOICES.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden className="pointer-events-none absolute right-0 size-[18px] text-ink-soft" />
        </div>
      </div>
      {p.merchant === "UNKNOWN" && (
        <Editing id="store-name">
          <Field
            label="Nome da loja"
            value={p.storeName}
            maxLength={80}
            hint="Como aparece na nota, por exemplo «Frutaria do Zé»."
            onChange={(e) => p.onStoreName(e.target.value)}
          />
        </Editing>
      )}

      <div className={ROW}>
        <span className={LABEL}>Data</span>
        <span className="flex-1 text-[15px] font-bold">{when ?? <span className="marker px-1">Por indicar</span>}</span>
        <EditButton what="data e hora" open={open === "date"} controls="date-fields" onClick={() => toggle("date")} />
      </div>
      {open === "date" && (
        <Editing id="date-fields">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data" type="date" value={p.date} onChange={(e) => p.onDate(e.target.value)} />
            <Field label="Hora" type="time" value={p.time} onChange={(e) => p.onTime(e.target.value)} />
          </div>
        </Editing>
      )}

      <div className={ROW}>
        <span className={LABEL}>Total</span>
        <span className="flex-1">
          <span className="marker px-1 font-display text-[22px] font-semibold">{p.printed !== null ? formatCents(p.printed) : "Por indicar"}</span>
        </span>
        <EditButton what="total da nota" open={open === "total"} controls="total-field" onClick={() => toggle("total")} />
      </div>
      {open === "total" && (
        <Editing id="total-field">
          <Field
            label="Total da nota"
            inputMode="decimal"
            value={p.printedText}
            error={p.printedInvalid ? "Total inválido (ex.: 3,49)." : undefined}
            onChange={(e) => p.onPrinted(e.target.value)}
          />
        </Editing>
      )}
    </section>
  );
}
