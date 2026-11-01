import type { Schemas } from "../../api/client";

export type ProductOrder = "compras" | "gasto" | "az";

export const ORDERS: { id: ProductOrder; label: string }[] = [
  { id: "compras", label: "Mais comprados" },
  { id: "gasto", label: "Mais gastos" },
  { id: "az", label: "A–Z" },
];

/** `?ordem=`: «gasto» or «az»; anything else (or nothing) is «Mais comprados». */
export const parseOrder = (value: string | null): ProductOrder => (value === "gasto" || value === "az" ? value : "compras");

type Item = Schemas["ProductSearchItem"];
const byName = (a: Item, b: Item) => a.name.localeCompare(b.name, "pt-PT");

/** The API has no order parameter: the list it returned (up to 100) is ordered here, without changing it. */
export function sortProducts(items: Item[], order: ProductOrder): Item[] {
  const compare =
    order === "az" ? byName : order === "gasto" ? (a: Item, b: Item) => b.spent_cents - a.spent_cents || byName(a, b) : (a: Item, b: Item) => b.purchases - a.purchases || byName(a, b);
  return [...items].sort(compare);
}
