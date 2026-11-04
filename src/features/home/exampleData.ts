import type { Schemas } from "../../api/client";

type Overview = Schemas["OverviewOut"];

/** The people in the example house. */
export const EXAMPLE_PEOPLE = 2;

/**
 * The Início «com dados de exemplo»: invented figures that live only here, in the client. Nothing in the example is
 * read from the API or written to it, and none of it is a value of the person's. Continente and Auchan are both in it
 * (they share a red, the tiles tell them apart), and so are the months and the weeks of a real month.
 */
export function exampleOverview(month: string): Overview {
  const day = (n: number) => `${month}-${String(n).padStart(2, "0")}`;
  const week = (index: number, from: number, to: number, spent_cents: number) => ({ index, from: day(from), to: day(to), spent_cents });
  return {
    month,
    spent_cents: 24800,
    goal_cents: 40000,
    goal_pct: 62,
    band: "attention",
    monthly_average_cents: 31800,
    recent_vs_average_pct: -7,
    average_trend: "below",
    average_months: 5,
    average_min_months: 2,
    purchases_this_month: 7,
    purchases_last_month: 11,
    weeks: [week(1, 1, 7, 5800), week(2, 8, 14, 9100), week(3, 15, 21, 5400), week(4, 22, 28, 4500)],
    by_merchant: [
      { merchant: "CONTINENTE", name: "Continente", spent_cents: 9800, purchases: 3, share_pct: 40 },
      { merchant: "PINGO_DOCE", name: "Pingo Doce", spent_cents: 6900, purchases: 2, share_pct: 28 },
      { merchant: "LIDL", name: "Lidl", spent_cents: 4800, purchases: 1, share_pct: 19 },
      { merchant: "AUCHAN", name: "Auchan", spent_cents: 3300, purchases: 1, share_pct: 13 },
    ],
    recent_receipts: [
      { id: "exemplo-1", merchant: "CONTINENTE", name: "Continente", date: day(27), total_cents: 4120, status: "CONFIRMED" },
      { id: "exemplo-2", merchant: "AUCHAN", name: "Auchan", date: day(24), total_cents: 3300, status: "CONFIRMED" },
      { id: "exemplo-3", merchant: "LIDL", name: "Lidl", date: day(20), total_cents: 2895, status: "CONFIRMED" },
    ],
    empty: false,
  };
}

export interface PriceChange {
  product: string;
  merchant: string;
  fromCents: number;
  toCents: number;
}

/** «O que mudou de preço» in the example: the API has no such figure yet, so the card only exists here. */
export const EXAMPLE_PRICE_CHANGES: PriceChange[] = [
  { product: "Azeite virgem extra 0,75 l", merchant: "PINGO_DOCE", fromCents: 649, toCents: 769 },
  { product: "Ovos M, 12 un.", merchant: "AUCHAN", fromCents: 259, toCents: 309 },
  { product: "Peito de frango, kg", merchant: "CONTINENTE", fromCents: 519, toCents: 499 },
];
