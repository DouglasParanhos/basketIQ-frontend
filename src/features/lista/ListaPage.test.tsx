import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { routes } from "../../App";
import { listArticles } from "../../test/fixtures";
import { currentDestinations, nav } from "../../test/nav";
import { renderRoutes } from "../../test/render";
import { banned } from "../../test/banned";
import { API, errorBody, server, serveConfig } from "../../test/server";

const FORBIDDEN = banned("perda|ranking|inteligente|sugest|recomend|previs");

const main = () => document.querySelector("main")!;

/** /lista with the smart list on; without `body` the default handler serves listArticles(). */
function lista(body?: ReturnType<typeof listArticles> | "error") {
  serveConfig({ app_name: "Super Mercado", smart_list_enabled: true });
  if (body) {
    server.use(
      http.get(`${API}/v1/lists/articles`, () =>
        body === "error" ? HttpResponse.json(errorBody("internal_error", "Erro"), { status: 500 }) : HttpResponse.json(body),
      ),
    );
  }
  renderRoutes(routes, "/lista");
}

describe("Lista, artigos (spec 015 US-A, F-146, F-153, F-154)", () => {
  it("F-146: with the smart list on, /lista is in the nav, current, with the same title as the other screens", async () => {
    lista();
    expect(await screen.findByRole("heading", { level: 1, name: "Lista" })).toBeInTheDocument();
    expect(within(nav()).getByRole("link", { name: "Lista" })).toBeInTheDocument();
    expect(currentDestinations()).toEqual(["Lista"]);
  });

  it("F-153: it says where the values come from, with the window the API gives", async () => {
    lista(listArticles({ window_days: 60 }));
    expect(await screen.findByText("Valores calculados com os seus talões dos últimos 60 dias. Não são preços de hoje.")).toBeInTheDocument();
  });

  it("F-153: one card per product, in the API order, each linking to the product, with the average it paid", async () => {
    lista();
    const [yogurt, chicken] = await screen.findAllByRole("link", { name: /Iogurte grego|Peito de frango/ });
    expect(yogurt).toHaveAttribute("href", "/produtos/p2");
    expect(chicken).toHaveAttribute("href", "/produtos/p1");
    expect(yogurt).toHaveTextContent("4 compras · 5 embalagens · cerca de 1,7 por mês");
    expect(chicken).toHaveTextContent(/^Peito de frango2 compras$/); // weighed: no package count
    expect(main().textContent).toMatch(/Preço médio que pagou: 1,59\s€ \/un\./);
    expect(main().textContent).toMatch(/Preço médio que pagou: 5,67\s€ \/kg/);
  });

  it("F-153: each store shows its purchases, the lowest and highest with the date and the discount, and the last price", async () => {
    lista();
    const lidl = (await screen.findByText("Lidl")).closest("li")!;
    expect(lidl).toHaveTextContent(/1,49\s€ \/un\.3 compras/);
    expect(lidl).toHaveTextContent(/mais baixo 1,25\s€ \/un\. \(10 set\.?, com desconto\)/);
    expect(lidl).toHaveTextContent(/mais alto 1,61\s€ \/un\. \(20 out\.?\)/);
    expect(lidl).toHaveTextContent(/última 1,61\s€ \/un\. \(20 out\.?\)/);
    const pingo = screen.getByText("Pingo Doce").closest("li")!;
    expect(pingo).toHaveTextContent("1 compra");
    expect(pingo).not.toHaveTextContent("mais baixo"); // one purchase: no range
    expect(screen.getByText("Talho Central")).toBeInTheDocument(); // a store the app does not support, by its name
  });

  it("F-153: the text is neutral and in European Portuguese", async () => {
    lista();
    await screen.findByText("Lidl");
    expect(main().textContent).not.toMatch(FORBIDDEN);
  });

  it("F-154: with nothing bought in the window it says so, without a list", async () => {
    lista(listArticles({ items: [] }));
    expect(await screen.findByText("Ainda não há compras confirmadas nestes 90 dias.")).toBeInTheDocument();
    expect(within(main()).queryAllByRole("listitem")).toHaveLength(0);
  });

  it("F-154: lines without an identified product are only counted", async () => {
    lista(listArticles({ excluded_lines: 3 }));
    expect(await screen.findByText("3 artigos ficaram de fora por não terem o produto identificado.")).toBeInTheDocument();
  });

  it("F-154: when it fails it says so with «Tentar de novo», and asking again reads again", async () => {
    lista("error");
    expect(await screen.findByText("Não foi possível mostrar a lista")).toBeInTheDocument();
    expect(main().textContent).not.toMatch(/\d,\d\d\s€/);
    server.resetHandlers();
    serveConfig({ app_name: "Super Mercado", smart_list_enabled: true });
    await userEvent.setup().click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByText("Lidl")).toBeInTheDocument();
  });

  it("F-146: with the smart list off, /lista is still the «page not found» screen (F-98)", async () => {
    serveConfig({ app_name: "Super Mercado", smart_list_enabled: false });
    renderRoutes(routes, "/lista");
    expect(await screen.findByText("Não foi possível mostrar esta página")).toBeInTheDocument();
    expect(screen.queryByText("Lidl")).not.toBeInTheDocument();
  });

  it("F-146: it writes nothing to localStorage or sessionStorage", async () => {
    lista();
    await screen.findByText("Lidl");
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});
