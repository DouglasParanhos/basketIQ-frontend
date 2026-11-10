import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import type { Schemas } from "../../api/client";
import { routes } from "../../App";
import { BANNED } from "../../test/banned";
import { line, productAnalytics, receipt } from "../../test/fixtures";
import { renderRoutes } from "../../test/render";
import { nb } from "../../test/text";
import { API, server } from "../../test/server";

const GROUP = { slug: "leite-uht", name: "Leite UHT", class_slug: "laticinios-e-ovos" };

function check(overrides: Partial<Schemas["PriceCheckOut"]> = {}): Schemas["PriceCheckOut"] {
  return { status: "above", basis: "l", purchases: 3, needed: 3, window_days: 90, price_cents: 130, average_cents: 100, effect_cents: 30, ...overrides };
}

function confirmed(lines: Schemas["LineOut"][], ungrouped = 0) {
  const r = receipt({ status: "CONFIRMED", confirmed_by: "USER", confirmed_at: "2026-09-15T12:41:00Z", lines, ungrouped_descriptions: ungrouped });
  server.use(http.get(`${API}/v1/receipts/r1`, () => HttpResponse.json(r)));
  renderRoutes(routes, "/compras/r1");
}

const grouped = (price_check: Schemas["PriceCheckOut"] | null) =>
  line({ grouping: { status: "grouped", group: GROUP, group_source: "catalog", size: { value: "1", unit: "l", source: "description" }, price_check } });

describe("Passo C na nota confirmada (D11, D13)", () => {
  it("F-76: a line clearly above what the person usually pays says so in words, with the average, the window and the purchases", async () => {
    confirmed([grouped(check()), { ...grouped(check({ status: "below", price_cents: 80, effect_cents: -20 })), id: "l2", raw_description: "LEITE UHT 6X1L" }]);
    const above = await screen.findByText(/Acima do que costuma pagar/);
    expect(above.textContent).toBe(nb("Acima do que costuma pagar: 1,30 € /l, a sua média é 1,00 € /l (3 compras em 90 dias)"));
    expect(screen.getByText(/Abaixo do que costuma pagar/).textContent).toContain(nb("0,80 € /l"));
    expect(document.body.textContent).not.toMatch(BANNED);
  });

  it("F-76: a normal price, no average yet or a missing size add nothing to the line", async () => {
    confirmed([grouped(check({ status: "normal" })), { ...grouped(check({ status: "no_average", purchases: 1 })), id: "l2" }, { ...grouped(null), id: "l3" }]);
    await screen.findByRole("article", { name: "Nota da compra" });
    expect(screen.queryByText(/costuma pagar/)).not.toBeInTheDocument();
  });

  it("F-77: the products left to group are said once, without blocking, with the way to complete them", async () => {
    confirmed([line()], 3);
    expect(await screen.findByText(/3 produtos desta nota ficaram por agrupar\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Completar" })).toHaveAttribute("href", "/por-completar");
  });

  it("F-77: one product is singular", async () => {
    confirmed([line()], 1);
    expect(await screen.findByText(/1 produto desta nota ficou por agrupar\./)).toBeInTheDocument();
  });
});

function comparison(overrides: Partial<Schemas["GroupComparisonOut"]> = {}): Schemas["GroupComparisonOut"] {
  return {
    group: GROUP,
    status: "clear_difference",
    basis: "l",
    window_days: 90,
    date_from: "2026-08-18",
    date_to: "2026-11-15",
    purchases: 6,
    average_cents: 115,
    needed: 3,
    chains: [
      { merchant: "ALDI", merchant_name: "Aldi", purchases: 3, average_cents: 130, missing_purchases: 0 },
      { merchant: "LIDL", merchant_name: "Lidl", purchases: 3, average_cents: 100, missing_purchases: 0 },
    ],
    typical_difference_cents: 30,
    ...overrides,
  };
}

function product(comp: Schemas["GroupComparisonOut"] | null) {
  server.use(
    http.get(`${API}/v1/products/p1/analytics`, () => HttpResponse.json(productAnalytics({ group: comp ? GROUP : null }))),
    http.get(`${API}/v1/groups/leite-uht/comparison`, () => HttpResponse.json(comp)),
  );
  renderRoutes(routes, "/produtos/p1");
}

describe("Passo C no produto (D12)", () => {
  it("F-78: the product's group shows what the person paid in each market, by name, with the window and a clear difference", async () => {
    product(comparison());
    const section = await screen.findByRole("region", { name: "Leite UHT: o que pagou em cada mercado" });
    await within(section).findByText("Aldi");
    expect(within(section).getAllByRole("listitem").map((li) => li.textContent)).toEqual([nb("Aldi1,30 € /l3 compras"), nb("Lidl1,00 € /l3 compras")]);
    expect(section.textContent).toContain("nos últimos 90 dias");
    expect(section.textContent).toContain(nb("A diferença é de cerca de 0,30 € numa compra típica."));
    expect(section.textContent).not.toMatch(BANNED);
  });

  it("F-79: without enough purchases, one market or a small difference, it says why there is no conclusion", async () => {
    product(comparison({ status: "single_chain", chains: [comparison().chains[1]!], typical_difference_cents: null }));
    expect(await screen.findByText("Só comprou em Lidl neste período; sem outro mercado para comparar.")).toBeInTheDocument();
  });

  it("F-79: a product without a group has no comparison", async () => {
    product(null);
    expect(await screen.findByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.queryByText(/o que pagou em cada mercado/)).not.toBeInTheDocument();
  });
});

const CATALOG: Schemas["CatalogOut"] = {
  version: 2,
  classes: [
    {
      slug: "laticinios-e-ovos",
      name: "Laticínios e ovos",
      groups: [
        { slug: "leite-uht", name: "Leite UHT", bases: ["l"], comparable: true },
        { slug: "queijo-fresco", name: "Queijo fresco", bases: ["kg"], comparable: true },
      ],
    },
    { slug: "casa-e-outros", name: "Casa e outros", groups: [{ slug: "nao-produto", name: "Depósitos", bases: [], comparable: false }] },
    { slug: "peixaria", name: "Peixaria", groups: [] },
  ],
};

function item(overrides: Partial<Schemas["ToCompleteItemOut"]> = {}): Schemas["ToCompleteItemOut"] {
  return {
    chain: "LIDL",
    merchant_name: "Lidl",
    description: "QUEIJO FETA 200G",
    description_key: "QUEIJO FETA 200G",
    unit: "un",
    lines: 2,
    purchases: 2,
    spent_cents: 500,
    group: null,
    hint: { slug: "queijos", name: "Queijos" },
    suggestions: [{ slug: "queijo-fresco", name: "Queijo fresco", class_slug: "charcutaria-e-queijos" }],
    rule_id: null,
    ...overrides,
  };
}

/** The «Por completar» API, recording what the screen sends. */
function toComplete(
  pages: Partial<Record<"ungrouped" | "missing_size", Schemas["ToCompleteItemOut"][]>>,
  rules: Schemas["LineRuleOut"][] = [],
  total?: number,
) {
  const calls: { method: string; body?: unknown; path?: string }[] = [];
  server.use(
    http.get(`${API}/v1/catalog/groups`, () => HttpResponse.json(CATALOG)),
    http.get(`${API}/v1/line-rules`, () => HttpResponse.json(rules)),
    http.get(`${API}/v1/to-complete`, ({ request }) => {
      const tab = new URL(request.url).searchParams.get("tab") as "ungrouped" | "missing_size";
      const items = pages[tab] ?? [];
      return HttpResponse.json({ tab, total: total ?? items.length, page_size: 10, items });
    }),
    http.put(`${API}/v1/line-rules`, async ({ request }) => {
      const body = (await request.json()) as Schemas["LineRulesIn"];
      calls.push({ method: "PUT", body });
      return HttpResponse.json({ rules: [], applied_lines: body.targets.length * 2 });
    }),
    http.delete(`${API}/v1/line-rules/:id`, ({ params }) => {
      calls.push({ method: "DELETE", path: String(params.id) });
      return new HttpResponse(null, { status: 204 });
    }),
  );
  renderRoutes(routes, "/por-completar");
  return calls;
}

describe("Por completar (D13)", () => {
  it("F-80: a suggested group is one tap, applies to every purchase of the description and can be undone", async () => {
    const calls = toComplete({ ungrouped: [item()] });
    const user = userEvent.setup();
    expect(await screen.findByRole("heading", { level: 1, name: "Por completar" })).toBeInTheDocument();
    expect(await screen.findByText("Parece ser da secção Queijos.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Queijo fresco" }));
    expect(await screen.findByText("Aplicado a 2 compras.")).toBeInTheDocument();
    expect(calls[0]).toEqual({ method: "PUT", body: { targets: [{ chain: "LIDL", description: "QUEIJO FETA 200G" }], group: "queijo-fresco" } });
    await user.click(screen.getByRole("button", { name: "Desfazer" }));
    // Back to what the description had: no rule at all.
    await waitFor(() =>
      expect(calls[1]).toEqual({ method: "PUT", body: { targets: [{ chain: "LIDL", description: "QUEIJO FETA 200G" }], group: null, not_comparable: false, size: null } }),
    );
    expect(document.body.textContent).not.toMatch(BANNED);
  });

  it("F-81: «Outro grupo» offers the comparable groups by class and applies the one chosen", async () => {
    const calls = toComplete({ ungrouped: [item()] });
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Outro grupo" }));
    const select = screen.getByRole("combobox", { name: "Grupo" });
    expect(within(select).queryByRole("option", { name: "Depósitos" })).not.toBeInTheDocument();
    await user.selectOptions(select, "leite-uht");
    await waitFor(() => expect(calls[0]?.body).toMatchObject({ group: "leite-uht" }));
  });

  it("F-82: «Não comparável» is one tap and is sent as such", async () => {
    const calls = toComplete({ ungrouped: [item()] });
    await userEvent.setup().click(await screen.findByRole("button", { name: "Não comparável" }));
    await waitFor(() => expect(calls[0]?.body).toMatchObject({ not_comparable: true }));
  });

  it("F-83: several descriptions are grouped at once, saying how many purchases change first", async () => {
    const calls = toComplete({ ungrouped: [item(), item({ description: "FETA GREGO", description_key: "FETA GREGO", lines: 3 })] });
    const user = userEvent.setup();
    await user.click(await screen.findByRole("checkbox", { name: "Selecionar QUEIJO FETA 200G" }));
    await user.click(screen.getByRole("checkbox", { name: "Selecionar FETA GREGO" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Atribuir os 2 selecionados a" }), "queijo-fresco");
    await user.click(screen.getByRole("button", { name: "Aplicar a 5 compras" }));
    await waitFor(() => expect((calls[0]?.body as Schemas["LineRulesIn"]).targets).toHaveLength(2));
  });

  it("F-84: a grouped description without a size gets one, in the units of its group", async () => {
    const calls = toComplete({ missing_size: [item({ description: "SALADA ICEBERGUE", description_key: "SALADA ICEBERGUE", hint: null, suggestions: [], group: { slug: "queijo-fresco", name: "Queijo fresco", class_slug: "x" } })] });
    const user = userEvent.setup();
    await user.click(await screen.findByRole("tab", { name: "Tamanho em falta" }));
    await user.click(await screen.findByRole("button", { name: "Indicar tamanho" }));
    await user.type(screen.getByRole("textbox", { name: "Tamanho de uma embalagem" }), "0,3");
    expect(within(screen.getByRole("combobox", { name: "Unidade" })).getAllByRole("option").map((o) => o.textContent)).toEqual(["kg"]);
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(calls[0]?.body).toMatchObject({ size: { value: "0.3", unit: "kg" } }));
  });

  it("F-85: only some are shown, the rest can wait; and the person's own rules can be removed", async () => {
    const rule: Schemas["LineRuleOut"] = {
      id: "rule-1",
      chain: "LIDL",
      description_key: "QUEIJO FETA 200G",
      description: "QUEIJO FETA 200G",
      group: { slug: "queijo-fresco", name: "Queijo fresco", class_slug: "x" },
      not_comparable: false,
      size: null,
      applied_lines: 2,
      updated_at: "2026-11-10T10:00:00Z",
    };
    const calls = toComplete({ ungrouped: [item()] }, [rule], 14);
    const user = userEvent.setup();
    expect(await screen.findByText("Mostramos os 10 com mais gasto, de 14. O resto pode esperar.")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Atribuídos por si" }));
    await screen.findByText("Lidl · Queijo fresco · aplicado a 2 compras");
    await user.click(screen.getByRole("button", { name: "Remover" }));
    await waitFor(() => expect(calls[0]).toEqual({ method: "DELETE", path: "rule-1" }));
    expect(await screen.findByText("Regra removida.")).toBeInTheDocument();
  });
});
