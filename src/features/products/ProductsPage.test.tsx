import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { productItem } from "../../test/fixtures";
import { renderRoutes } from "../../test/render";
import { API, server } from "../../test/server";
import ProductsPage from "./ProductsPage";

const routes = [
  { path: "/produtos", element: <ProductsPage /> },
  { path: "/produtos/:id", element: <p>detalhe do produto</p> },
];
const plain = (s: string | null) => (s ?? "").replace(/\u00a0/g, " ");
const open = (url = "/produtos") => renderRoutes(routes, url);

function serveProducts(items: ReturnType<typeof productItem>[]) {
  const asked: { q: string | null; limit: string | null }[] = [];
  server.use(
    http.get(`${API}/v1/products`, ({ request }) => {
      const url = new URL(request.url);
      asked.push({ q: url.searchParams.get("q"), limit: url.searchParams.get("limit") });
      return HttpResponse.json(items);
    }),
  );
  return asked;
}
const all = [
  productItem({ id: "1", name: "Banana", unit_type: "kg", price_basis: "kg", avg_price_cents: 149, purchases: 5, merchants: 3, spent_cents: 700 }),
  productItem({ id: "2", name: "Leite meio-gordo", unit_type: "l", price_basis: "l", avg_price_cents: 85, purchases: 9, merchants: 1, spent_cents: 900 }),
  productItem({ id: "3", name: "Ovos M", unit_type: "un", price_basis: "un", avg_price_cents: 27, purchases: 1, merchants: 2, spent_cents: 300 }),
  productItem({ id: "4", name: "Água", unit_type: null, price_basis: "un", avg_price_cents: null, purchases: 2, merchants: 1, spent_cents: 100 }),
];

describe("list of products (spec 012, US3)", () => {
  it("F-197: asks for up to 100 products and shows name, the counts and the average price with its base", async () => {
    const asked = serveProducts(all);
    open();
    const banana = await screen.findByRole("link", { name: /Banana/ });
    expect(asked[0]).toEqual({ q: null, limit: "100" });
    expect(plain(banana.textContent)).toContain("5 compras · 3 mercados");
    expect(plain(banana.textContent)).toContain("1,49 € /kg");
    expect(plain(banana.textContent)).toContain("preço médio");
    expect(plain(screen.getByRole("link", { name: /Leite/ }).textContent)).toContain("9 compras · 1 mercado");
    expect(plain(screen.getByRole("link", { name: /Leite/ }).textContent)).toContain("0,85 € /l");
    expect(plain(screen.getByRole("link", { name: /Ovos/ }).textContent)).toContain("1 compra · 2 mercados");
    expect(plain(screen.getByRole("link", { name: /Ovos/ }).textContent)).toContain("0,27 € /un.");
  });

  it("F-197: a product with no average price shows no price, only a word for assistive technology", async () => {
    serveProducts(all);
    open();
    const water = await screen.findByRole("link", { name: /Água/ });
    expect(plain(water.textContent)).not.toMatch(/\d,\d\d €/);
    expect(plain(water.textContent)).toContain("—");
    expect(within(water).getByText("sem preço médio")).toHaveClass("sr-only");
  });

  it("F-197: the order is «Mais comprados» by default, and «Mais gastos» and «A–Z» reorder without a new request", async () => {
    const asked = serveProducts(all);
    const user = userEvent.setup();
    const { router } = open();
    await screen.findByRole("link", { name: /Banana/ });
    const order = () => screen.getAllByRole("link").map((l) => l.textContent!.slice(0, 5));
    expect(order()[0]).toContain("Leite"); // 9 purchases
    await user.click(screen.getByRole("radio", { name: "Mais gastos" }));
    expect(router.state.location.search).toBe("?ordem=gasto");
    expect(order()[0]).toContain("Leite"); // 900
    await user.click(screen.getByRole("radio", { name: "A–Z" }));
    expect(router.state.location.search).toBe("?ordem=az");
    expect(order()).toEqual(expect.arrayContaining([expect.stringContaining("Água")]));
    expect(order()[0]).toContain("Água");
    expect(router.state.historyAction).toBe("REPLACE");
    expect(asked).toHaveLength(1);
  });

  it("F-197: an unknown order in the URL is the default", async () => {
    serveProducts(all);
    open("/produtos?ordem=xyz");
    await screen.findByRole("link", { name: /Banana/ });
    expect(screen.getByRole("radio", { name: "Mais comprados" })).toBeChecked();
  });

  it("F-197: the search stays on the server, labelled «Pesquisar produto»", async () => {
    const asked = serveProducts(all);
    open();
    await screen.findByRole("link", { name: /Banana/ });
    await userEvent.setup().type(screen.getByRole("searchbox", { name: "Pesquisar produto" }), "leite");
    await waitFor(() => expect(asked.some((a) => a.q === "leite")).toBe(true));
  });

  it("F-197: a row opens the product, and the empty lists say what to do", async () => {
    serveProducts(all);
    const { router } = open();
    await userEvent.setup().click(await screen.findByRole("link", { name: /Banana/ }));
    expect(router.state.location.pathname).toBe("/produtos/1");
  });

  it("F-197: with no products the list says they appear after confirming purchases; a search with no result names the term", async () => {
    serveProducts([]);
    const view = open();
    expect(await screen.findByText("Os produtos aparecem aqui depois de confirmar compras.")).toBeInTheDocument();
    view.unmount();
    serveProducts([]);
    open("/produtos?q=xyz");
    expect(await screen.findByText(/Nenhum produto com “xyz” nas compras confirmadas\./)).toBeInTheDocument();
  });

  it("F-197: the screen has a «Produtos» title for assistive technology and no first-level heading, and never says «mais barato»", async () => {
    serveProducts(all);
    open();
    expect(await screen.findByRole("heading", { level: 2, name: "Produtos" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/mais barato/i);
  });
});
