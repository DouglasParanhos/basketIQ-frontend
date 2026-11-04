import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { productAnalytics } from "../../test/fixtures";
import { renderRoutes } from "../../test/render";
import { API, errorBody, server } from "../../test/server";
import ProductPage from "./ProductPage";

const routes = [
  { path: "/produtos/:id", element: <ProductPage /> },
  { path: "/produtos", element: <p>lista de produtos</p> },
];
const plain = (s: string | null) => (s ?? "").replace(/\u00a0/g, " ");
const open = (analytics = productAnalytics()) => {
  server.use(http.get(`${API}/v1/products/p1/analytics`, () => HttpResponse.json(analytics)));
  return renderRoutes(routes, "/produtos/p1");
};

describe("product detail (spec 012, US3)", () => {
  it("F-197: shows the weighted average price with its base and the note, and the minimum, maximum and quantity", async () => {
    open();
    expect(await screen.findByRole("heading", { level: 1, name: "Peito de frango" })).toBeInTheDocument();
    const card = screen.getByRole("region", { name: "Preço médio por kg" });
    expect(plain(card.textContent)).toContain("5,52 €");
    expect(card.textContent).toContain("Média ponderada pelas quantidades que comprou");
    const values = Object.fromEntries(within(card).getAllByRole("term").map((t) => [t.textContent, plain(t.nextElementSibling!.textContent)]));
    expect(values).toEqual({ Mínimo: "4,99 €", Máximo: "5,89 €", Comprou: "4,8 kg" });
  });

  it("F-197: the price is per litre or per unit when that is the base", async () => {
    open(productAnalytics({ price_basis: "l", product: { id: "p1", name: "Leite", unit_type: "l" }, total_quantity: "18" }));
    expect(await screen.findByRole("region", { name: "Preço médio por litro" })).toBeInTheDocument();
  });

  it("F-197: the evolution has one point per purchase and a table with the original description", async () => {
    open();
    const evolution = (await screen.findByRole("heading", { name: "Evolução do preço" })).closest("section")!;
    expect(within(evolution).getByText("Ver como tabela")).toBeInTheDocument();
    const table = within(evolution).getByRole("table", { name: "Histórico de compras" });
    expect(within(table).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Data", "Mercado", "Descrição original", "Quantidade", "Preço", "Pago"]);
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(4);
    expect(rows.map((r) => within(r).getAllByRole("cell")[2]!.textContent)).toEqual(["PEITO FRANGO 1KG", "FRANGO PEITO", "PEITO DE FRANGO", "PEITO FRANGO"]);
  });

  it("F-197: does not say the original description is kept (a line edited in a review can change it)", async () => {
    open();
    await screen.findByRole("heading", { level: 1, name: "Peito de frango" });
    expect(document.body.textContent).not.toMatch(/descrição original de cada compra fica guardada/i);
  });

  it("F-197: «Preço médio que pagou, por mercado» shows each store's average, last price and purchases, in the order of the API, with no label and no window", async () => {
    open();
    const block = (await screen.findByRole("heading", { name: "Preço médio que pagou, por mercado" })).closest("section")!;
    const rows = within(block).getAllByRole("listitem");
    expect(rows.map((r) => plain(r.textContent))).toEqual([
      "Lidl4,99 € · último 4,99 €1 compra",
      "Mercadona5,79 € · último 5,79 €1 compra",
      "Pingo Doce5,69 € · último 5,49 €2 compras",
    ]);
    expect(within(block).getByText("Nos seus talões")).toBeInTheDocument();
    expect(block.textContent).not.toMatch(/mais barato|90 dias|ranking|melhor/i);
  });

  it("F-197: with little history it says when the evolution appears, and says when units are mixed", async () => {
    open(productAnalytics({ insufficient_data: true, mixed_units: true, history: productAnalytics().history.slice(0, 1) }));
    expect(await screen.findByText("É preciso comprar este produto mais vezes para ver a evolução do preço.")).toBeInTheDocument();
    expect(screen.getByText("Algumas compras usam outra unidade e não entram no preço médio.")).toBeInTheDocument();
  });

  it("F-197: the back button is «Voltar aos produtos», of 44 px at least, and leads to the list", async () => {
    const { router } = open();
    const back = await screen.findByRole("link", { name: "Voltar aos produtos" });
    expect(back).toHaveClass("size-11");
    await userEvent.setup().click(back);
    expect(router.state.location.pathname).toBe("/produtos");
  });

  it("F-197: an unknown product says so", async () => {
    server.use(http.get(`${API}/v1/products/p1/analytics`, () => HttpResponse.json(errorBody("not_found", "Produto não encontrado."), { status: 404 })));
    renderRoutes(routes, "/produtos/p1");
    expect(await screen.findByText("Produto não encontrado.")).toBeInTheDocument();
  });
});
