import type { Schemas } from "../../api/client";
import { formatCents, formatQuantity, formatUnitPrice } from "../../lib/format";

type Expected = NonNullable<Schemas["ShoppingItemOut"]["expected"]>;

/** «0,82 €» for a counted product, «5,52 € /kg» for a weighed one: only a price by weight or volume says its base. */
export function priceText(cents: number | null | undefined, basis: string): string {
  return basis === "un" ? formatCents(cents) : formatUnitPrice(cents, basis);
}

/** The value of a row: «~» in front when the price was paid at another supermarket. */
export function expectedText(e: Expected): string {
  const price = priceText(e.price_cents, e.price_basis);
  return e.other_merchant ? `~ ${price}` : price;
}

/** «6 un.», «2 l», «1»: the quantity of an item as the row shows it under the name. */
export function quantityText(item: Pick<Schemas["ShoppingItemOut"], "quantity" | "unit">): string {
  const unit = item.unit === "un" ? "un." : item.unit;
  return [formatQuantity(item.quantity), unit].filter(Boolean).join(" ");
}
