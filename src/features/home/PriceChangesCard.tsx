import { ArrowDown, ArrowUp } from "lucide-react";
import { useId } from "react";
import { MarketTile } from "../../components/MarketBadge";
import { merchantName } from "../../lib/merchants";
import { formatCents, formatPercent } from "../../lib/format";
import type { PriceChange } from "./exampleData";

/**
 * «O que mudou de preço»: the same product in the same store, the last two purchases. A rise is gold (to look at), a fall
 * is green; the arrow and the sign say it as well, never the colour alone. The API has no such figure yet, so this card
 * is only shown in the example.
 */
export function PriceChangesCard({ changes }: { changes: PriceChange[] }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-1.5 rounded-surface bg-paper p-4 ring-1 ring-inset ring-line">
      <div>
        <h2 id={id} className="text-sm font-bold">
          O que mudou de preço
        </h2>
        <p className="text-xs text-ink-soft">Nos seus talões, desde a última compra</p>
      </div>
      <ul className="flex flex-col">
        {changes.map(({ product, merchant, fromCents, toCents }) => {
          const delta = toCents - fromCents;
          const up = delta > 0;
          const Arrow = up ? ArrowUp : ArrowDown;
          return (
            <li key={product} className="flex items-center gap-2.5 border-t border-line py-2">
              <MarketTile code={merchant} size={32} fontSize={14} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{product}</p>
                <p className="text-xs text-ink-soft">
                  {merchantName(merchant)} · {formatCents(fromCents)} → {formatCents(toCents)}
                </p>
              </div>
              <span className={`flex shrink-0 items-center gap-1 rounded-xl px-2 py-1 text-xs font-extrabold ${up ? "bg-warn-soft dark:ring-1 dark:ring-inset dark:ring-warn-line text-warn-ink" : "bg-ok-soft text-ok"}`}>
                <Arrow aria-hidden className="size-3.5" strokeWidth={2.4} />
                {up ? "+" : "−"} {formatCents(Math.abs(delta))}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-[length:calc(0.6875rem_*_var(--text-scale))] leading-snug text-ink-soft">Só mostramos mudanças de {formatPercent(15)} ou mais e de {formatCents(20)} ou mais.</p>
    </section>
  );
}
