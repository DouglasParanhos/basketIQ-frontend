import { ArrowDown, ArrowUp } from "lucide-react";
import type { Schemas } from "../../api/client";
import { formatUnitPrice, plural } from "../../lib/format";

/**
 * Step C (D11) under a line of a confirmed receipt: only when the price is clearly above or below what the person usually
 * pays for the same group (15 % and 0,20 € on the line, decided by the API). The arrow and the words say it, never the
 * colour alone; the average comes with its window and number of purchases.
 */
export function PriceCheck({ check }: { check: Schemas["PriceCheckOut"] | null | undefined }) {
  if (!check || (check.status !== "above" && check.status !== "below") || !check.basis) return null;
  const up = check.status === "above";
  const Arrow = up ? ArrowUp : ArrowDown;
  return (
    <p className={`flex items-start gap-1 text-xs font-bold ${up ? "text-warn-ink" : "text-ok"}`}>
      <Arrow aria-hidden className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.4} />
      <span>
        {up ? "Acima" : "Abaixo"} do que costuma pagar: {formatUnitPrice(check.price_cents, check.basis)}, a sua média é{" "}
        {formatUnitPrice(check.average_cents, check.basis)} ({plural(check.purchases, "compra", "compras")} em {check.window_days} dias)
      </span>
    </p>
  );
}
