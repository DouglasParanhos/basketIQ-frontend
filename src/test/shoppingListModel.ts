import type { Schemas } from "../api/client";
import { MERCHANT_OPTIONS } from "../lib/merchants";

type Out = Schemas["ShoppingListOut"];
type Item = Schemas["ShoppingItemOut"];

const SUPERMARKETS = MERCHANT_OPTIONS;

const CATEGORIES: [string, string][] = [
  ["animais", "Animais"],
  ["bebe", "Bebé"],
  ["bebidas", "Bebidas"],
  ["charcutaria", "Charcutaria"],
  ["congelados", "Congelados"],
  ["frutas_legumes", "Frutas e legumes"],
  ["higiene", "Higiene"],
  ["laticinios_ovos", "Laticínios e ovos"],
  ["limpeza", "Limpeza"],
  ["mercearia", "Mercearia"],
  ["padaria", "Padaria"],
  ["peixaria", "Peixaria"],
  ["talho", "Talho"],
  ["outros", "Outros"],
];

/** What the fake knows about one product: the last price paid at each supermarket (cents) and every purchase. */
export interface Seed {
  id: string;
  name: string;
  category: string;
  quantity?: string;
  unit?: string | null;
  checked?: boolean;
  already_have?: boolean;
  prices?: Record<string, { cents: number; date: string }>;
  history?: { date: string; cents: number; merchant: string }[];
}

/** The list of the approved design: Leite, Ovos (ticked), Arroz, Café (at home), Pão (no price). */
export const DESIGN_SEED: Seed[] = [
  { id: "i1", name: "Leite meio-gordo", category: "laticinios_ovos", quantity: "6", unit: "un", prices: { LIDL: { cents: 82, date: "2026-11-02" } }, history: [{ date: "2026-09-20", cents: 79, merchant: "LIDL" }, { date: "2026-11-02", cents: 82, merchant: "LIDL" }] },
  { id: "i2", name: "Ovos classe M", category: "laticinios_ovos", quantity: "12", unit: "un", checked: true, prices: { LIDL: { cents: 289, date: "2026-10-12" } }, history: [{ date: "2026-10-12", cents: 289, merchant: "LIDL" }] },
  { id: "i3", name: "Arroz agulha", category: "mercearia", quantity: "1", unit: "un", prices: { CONTINENTE: { cents: 129, date: "2026-10-20" } }, history: [{ date: "2026-10-20", cents: 129, merchant: "CONTINENTE" }] },
  {
    id: "i4",
    name: "Café moído",
    category: "mercearia",
    quantity: "250",
    unit: "g",
    already_have: true,
    prices: { LIDL: { cents: 494, date: "2026-11-01" } },
    history: [
      { date: "2026-06-10", cents: 589, merchant: "LIDL" },
      { date: "2026-08-12", cents: 589, merchant: "LIDL" },
      { date: "2026-10-04", cents: 399, merchant: "LIDL" },
      { date: "2026-11-01", cents: 494, merchant: "LIDL" },
    ],
  },
  { id: "i5", name: "Pão de forma", category: "padaria", quantity: "1", unit: "un" },
];

export interface Model {
  /** Calls received by the writing endpoints: the method, the item (or what was done) and the body. */
  calls: { method: string; path: string; body: unknown }[];
  state: {
    merchant: string;
    items: (Seed & { removed?: boolean })[];
    suggestions: { product_id: string; name: string; category: string; category_name: string }[];
  };
  /** Answers a request of the list API; `path` is what comes after `/v1/lists/current`. Null when it is not one of the list's. */
  handle(method: string, path: string, body: unknown): { status: number; body: unknown } | null;
}

/** The shopping-list API in memory, as the backend answers it (the rules in short). Used by the unit tests (MSW) and by the e2e. */
export function shoppingListModel(seed: Seed[] = DESIGN_SEED, merchant = "LIDL"): Model {
  const state: Model["state"] = { merchant, items: structuredClone(seed), suggestions: [] };
  const calls: Model["calls"] = [];
  const categoryName = (c: string) => CATEGORIES.find(([id]) => id === c)?.[1] ?? "Outros";

  const expected = (s: Seed, m: string): Item["expected"] => {
    const prices = s.prices ?? {};
    const own = prices[m];
    const latest = Object.entries(prices).sort((a, b) => b[1].date.localeCompare(a[1].date))[0];
    const hit = own ? ([m, own] as const) : latest;
    if (!hit) return null;
    return {
      price_cents: hit[1].cents,
      price_basis: "un",
      date: hit[1].date,
      merchant: hit[0],
      merchant_name: SUPERMARKETS.find(([id]) => id === hit[0])?.[1] ?? hit[0],
      other_merchant: hit[0] !== m,
      source: "own_receipts",
    };
  };

  const view = (): Out => {
    const items = state.items.filter((i) => !i.removed);
    const order = CATEGORIES.map(([id]) => id);
    const sorted = [...items].sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category));
    const counted = items.filter((i) => !i.already_have || i.checked);
    return {
      merchant: state.merchant,
      categories: CATEGORIES.map(([id, label]) => ({ id, name: label })),
      items: sorted.map((i) => ({
        id: i.id,
        name: i.name,
        category: i.category,
        category_name: categoryName(i.category),
        quantity: i.quantity ?? "1",
        unit: i.unit ?? null,
        checked: !!i.checked,
        already_have: !!i.already_have,
        product_id: i.prices ? `p-${i.id}` : null,
        expected: expected(i, state.merchant),
      })),
      estimates: SUPERMARKETS.map(([id, label]) => {
        // Priced by quantity, as the backend does.
        const found = counted.flatMap((i) => {
          const e = expected(i, id);
          return e ? [{ e, quantity: Number(i.quantity ?? "1") }] : [];
        });
        return {
          merchant: id,
          merchant_name: label,
          total_cents: found.reduce((sum, f) => sum + Math.round(f.e.price_cents * f.quantity), 0),
          items_with_price: found.length,
          other_merchant_values: found.filter((f) => f.e.other_merchant).length,
        };
      }),
      items_total: items.length,
      checked_count: items.filter((i) => i.checked).length,
      already_have_excluded: items.filter((i) => i.already_have && !i.checked).length,
    };
  };

  const find = (id: string) => state.items.find((i) => i.id === id);
  const ok = (body: unknown, status = 200) => ({ status, body });
  const notFound = () => ({ status: 404, body: { code: "not_found", message: "Item não encontrado.", request_id: "r" } });

  const evolution = (id: string) => {
    const item = find(id);
    const points = (item?.history ?? []).map((h) => ({
      date: h.date,
      price_cents: h.cents,
      quantity: "1",
      merchant: h.merchant,
      merchant_name: SUPERMARKETS.find(([code]) => code === h.merchant)?.[1] ?? h.merchant,
      origin: "own" as const,
    }));
    if (!item || points.length === 0) {
      return { has_history: false, price_basis: null, expected: null, last_cents: null, min_cents: null, max_cents: null, points: [] };
    }
    const cents = points.map((p) => p.price_cents);
    return {
      has_history: true,
      price_basis: "un",
      expected: expected(item, state.merchant),
      last_cents: cents[cents.length - 1],
      min_cents: Math.min(...cents),
      max_cents: Math.max(...cents),
      points,
    };
  };

  function handle(method: string, path: string, body: unknown) {
    const [, section, id, action] = path.split("/");
    if (method === "GET" && path === "") return ok(view());
    if (method === "GET" && path === "/suggestions") return ok(state.suggestions);
    if (method === "GET" && section === "items" && action === "evolution") return ok(evolution(id ?? ""));
    if (method === "PUT" && path === "/merchant") {
      calls.push({ method, path: "merchant", body });
      state.merchant = (body as { merchant: string }).merchant;
      return ok(view());
    }
    if (method === "POST" && path === "/items") {
      calls.push({ method, path: "items", body });
      const added = body as { name: string; already_have?: boolean };
      state.items.push({ id: `n${state.items.length + 1}`, name: added.name, category: "outros", already_have: added.already_have });
      return ok(view(), 201);
    }
    if (section === "items" && id) {
      const item = find(id);
      if (method === "PATCH") {
        calls.push({ method, path: id, body });
        if (!item || item.removed) return notFound();
        Object.assign(item, body);
        return ok(view());
      }
      if (method === "DELETE") {
        calls.push({ method, path: id, body: null });
        if (item) item.removed = true;
        return ok(view());
      }
      if (method === "POST" && action === "restore") {
        calls.push({ method, path: `${id}/restore`, body: null });
        if (item) item.removed = false;
        return ok(view());
      }
    }
    return null;
  }

  return { calls, state, handle };
}
