import { onlineManager } from "@tanstack/react-query";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it } from "vitest";
import { routes } from "../../App";
import { currentDestinations, nav } from "../../test/nav";
import { banned } from "../../test/banned";
import { renderRoutes } from "../../test/render";
import { API, errorBody, server, serveConfig } from "../../test/server";
import { DESIGN_SEED, shoppingListFake, type Seed } from "../../test/shoppingListFake";
import { AnnounceProvider } from "../../components/Announce";
import { formatDate } from "../../lib/format";
import { ListaPage } from "./ListaPage";
import { UNDO_MS } from "./UndoNotice";

const FORBIDDEN = banned("acima d|abaixo d|ranking|preço de hoje é|só hoje|não perca");

/** /lista with the option on and the fake list of the design (Leite, Ovos ticked, Arroz, Café at home, Pão without price). */
function lista(seed: Seed[] = DESIGN_SEED) {
  serveConfig({ app_name: "Super Mercado", smart_list_enabled: true });
  const fake = shoppingListFake(seed);
  server.use(...fake.handlers);
  renderRoutes(routes, "/lista");
  return fake;
}

const row = (name: string) => screen.getByText(name, { selector: "span" }).closest("li")!;
const openEvolution = async (name: string) => {
  const user = userEvent.setup();
  await screen.findByText(name);
  await user.click(within(row(name)).getByRole("button", { name: /Ver evolução/ }));
  return user;
};
const names = () => [...document.querySelectorAll("main li span[id]")].map((s) => s.textContent);

afterEach(() => {
  onlineManager.setOnline(true);
});

describe("Lista de compras: G1, a lista e o carrinho", () => {
  it("F-146: with the option on, /lista is in the nav, current, and its title is «Lista de compras»", async () => {
    lista();
    expect(await screen.findByRole("heading", { level: 1, name: "Lista de compras" })).toBeInTheDocument();
    expect(within(nav()).getByRole("link", { name: "Lista" })).toBeInTheDocument();
    expect(currentDestinations()).toEqual(["Lista"]);
  });

  it("F-313: the products are in category groups, each row with a checkbox, the name, the quantity and the value", async () => {
    lista();
    expect(await screen.findByRole("heading", { level: 2, name: "Laticínios e ovos" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Laticínios e ovos", "Mercearia", "Padaria"]);
    const milk = within(row("Leite meio-gordo"));
    expect(milk.getByRole("checkbox", { name: "Leite meio-gordo" })).not.toBeChecked();
    expect(milk.getByText("6 un.")).toBeInTheDocument();
    expect(milk.getByText("0,82 €")).toBeInTheDocument();
    expect(milk.getByRole("button", { name: "Mais opções de Leite meio-gordo" })).toBeInTheDocument();
  });

  it("F-314: ticking an item keeps it where it is, struck through, and the header counts the cart", async () => {
    const fake = lista();
    const user = userEvent.setup();
    await screen.findByText("Leite meio-gordo");
    const before = names();
    expect(screen.getByText("5 produtos · 1 no carrinho")).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "Leite meio-gordo" }));
    expect(screen.getByText("5 produtos · 2 no carrinho")).toBeInTheDocument();
    expect(names()).toEqual(before);
    expect(screen.getByText("Leite meio-gordo", { selector: "span" })).toHaveClass("line-through");
    await waitFor(() => expect(fake.calls).toContainEqual({ method: "PATCH", path: "i1", body: { checked: true } }));
  });

  it("F-315: the field Supermercado opens the choice of every supermarket with its estimate, and the choice goes back to the field", async () => {
    const fake = lista();
    const user = userEvent.setup();
    const field = await screen.findByRole("button", { name: /Supermercado.*Lidl/ });
    await user.click(field);
    const group = screen.getByRole("group", { name: "Supermercado" });
    expect(within(group).getAllByRole("radio").map((r) => r.closest("label")!.textContent)).toEqual([
      expect.stringContaining("Continente"),
      expect.stringContaining("Pingo Doce"),
      expect.stringContaining("Lidl"),
      expect.stringContaining("Auchan"),
      expect.stringContaining("Aldi"),
      expect.stringContaining("Mercadona"),
      expect.stringContaining("El Corte Inglés"),
    ]);
    expect(within(group).getByRole("radio", { name: /Lidl/ })).toBeChecked();
    await user.click(within(group).getByRole("radio", { name: /Continente/ }));
    await waitFor(() => expect(fake.calls).toContainEqual({ method: "PUT", path: "merchant", body: { merchant: "CONTINENTE" } }));
    expect(screen.getByRole("button", { name: /Supermercado.*Continente/ })).toHaveFocus();
    expect(screen.queryByRole("group", { name: "Supermercado" })).toBeNull();
  });

  it("F-316: the estimate counts what is not at home and says how many values are from other supermarkets; the note says what it leaves out", async () => {
    lista();
    const field = await screen.findByRole("button", { name: /Supermercado.*Lidl/ });
    // Leite 6 × 0,82 + Ovos 12 × 2,89 (in the cart) + Arroz 1 × 1,29 (paid at the Continente); the Café is at home and not in the cart.
    expect(within(field).getByText("40,89 €")).toBeInTheDocument();
    expect(within(field).getByText("Estimativa")).toBeInTheDocument();
    expect(screen.getByText("1 valor de outro supermercado")).toBeInTheDocument();
    expect(screen.getByText("Preços esperados, não de hoje. Não inclui os 1 «Já tenho».")).toBeInTheDocument();
    expect(within(row("Arroz agulha")).getByText("~ 1,29 €")).toBeInTheDocument();
    expect(within(row("Arroz agulha")).getByText("Continente")).toBeInTheDocument();
  });

  it("F-317: it shows a loading skeleton, then an error with «Tentar de novo» that reads the list again", async () => {
    serveConfig({ app_name: "Super Mercado", smart_list_enabled: true });
    server.use(http.get(`${API}/v1/lists/current`, () => HttpResponse.json(errorBody("internal_error", "Erro."), { status: 500 }), { once: true }), ...shoppingListFake().handlers);
    renderRoutes(routes, "/lista");
    expect(await screen.findByRole("status", { name: "A carregar a lista" })).toBeInTheDocument();
    expect(await screen.findByText("Não foi possível carregar a lista.")).toBeInTheDocument();
    expect(screen.getByText("Algo falhou do nosso lado. Tente de novo daqui a pouco.")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByText("Leite meio-gordo")).toBeInTheDocument();
  });

  it("F-317: an empty list says so and offers «Adicionar»", async () => {
    lista([]);
    expect(await screen.findByText("A sua lista está vazia.")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Adicionar" }).length).toBeGreaterThan(0);
    expect(screen.getByText("0 produtos · 0 no carrinho")).toBeInTheDocument();
  });

  it("F-318: with no connection a tick shows on the screen, the notice says it will be saved, and it is sent when the connection returns; nothing is kept on the device", async () => {
    const fake = lista();
    const user = userEvent.setup();
    await screen.findByText("Leite meio-gordo");
    act(() => onlineManager.setOnline(false));
    expect(await screen.findByText("Sem ligação · a guardar quando voltar")).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "Leite meio-gordo" }));
    expect(screen.getByRole("checkbox", { name: "Leite meio-gordo" })).toBeChecked();
    expect(fake.calls.filter((c) => c.method === "PATCH")).toEqual([]);
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    act(() => onlineManager.setOnline(true));
    await waitFor(() => expect(fake.calls).toContainEqual({ method: "PATCH", path: "i1", body: { checked: true } }));
    await waitFor(() => expect(screen.queryByText("Sem ligação · a guardar quando voltar")).toBeNull());
  });
});

describe("Lista de compras: «Já tenho», os três pontinhos, excluir e desfazer", () => {
  it("F-319: a product at home has the house and the sage background, is not struck through, and says nothing in words on the row", async () => {
    lista();
    await screen.findByText("Café moído");
    const coffee = row("Café moído");
    expect(within(coffee).getByRole("img", { name: "Já tenho em casa" })).toBeInTheDocument();
    expect(coffee).toHaveClass("bg-have");
    expect(screen.getByText("Café moído", { selector: "span" })).not.toHaveClass("line-through");
    expect(within(coffee).queryByText(/já tenho/i)).toBeNull();
    expect(row("Leite meio-gordo")).not.toHaveClass("bg-have");
  });

  it("F-320: the three dots open a menu of three, which the arrows walk, and Esc closes and gives the focus back", async () => {
    lista();
    const user = userEvent.setup();
    const dots = await screen.findByRole("button", { name: "Mais opções de Leite meio-gordo" });
    expect(dots).toHaveAttribute("aria-haspopup", "menu");
    await user.click(dots);
    const menu = screen.getByRole("menu");
    const items = within(menu).getAllByRole("menuitem");
    expect(items.map((i) => i.textContent)).toEqual([
      "Editar",
      "Já tenho em casaFica na lista, sem entrar na compra.",
      "Excluir da lista",
    ]);
    expect(items[0]).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(items[1]).toHaveFocus();
    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(items[2]).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(dots).toHaveFocus();
  });

  it("F-321: «Já tenho em casa» sets the state, and a product at home offers «Voltar a pôr na compra»", async () => {
    const fake = lista();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Mais opções de Leite meio-gordo" }));
    await user.click(screen.getByRole("menuitem", { name: /Já tenho em casa/ }));
    await waitFor(() => expect(fake.calls).toContainEqual({ method: "PATCH", path: "i1", body: { already_have: true } }));
    expect(within(row("Leite meio-gordo")).getByRole("img", { name: "Já tenho em casa" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Mais opções de Café moído" }));
    expect(screen.getByRole("menuitem", { name: /Voltar a pôr na compra.*Volta a contar na estimativa\./ })).toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: /Voltar a pôr na compra/ }));
    await waitFor(() => expect(fake.calls).toContainEqual({ method: "PATCH", path: "i4", body: { already_have: false } }));
    expect(within(row("Café moído")).queryByRole("img", { name: "Já tenho em casa" })).toBeNull();
  });

  it("F-322: «Excluir da lista» takes the item out at once, says so with «Desfazer» without taking the focus, and «Desfazer» puts it back in the same place", async () => {
    const fake = lista();
    const user = userEvent.setup();
    await screen.findByText("Leite meio-gordo");
    const before = names();
    await user.click(screen.getByRole("button", { name: "Mais opções de Ovos classe M" }));
    await user.click(screen.getByRole("menuitem", { name: "Excluir da lista" }));
    await waitFor(() => expect(screen.queryByText("Ovos classe M", { selector: "span" })).toBeNull());
    const notice = screen.getByRole("button", { name: "Desfazer" }).closest<HTMLElement>("[role=status]")!;
    expect(notice).toHaveTextContent("Ovos classe M removido da lista.");
    expect(notice).not.toContainElement(document.activeElement as HTMLElement);
    await waitFor(() => expect(fake.calls).toContainEqual({ method: "DELETE", path: "i2", body: null }));
    await user.click(within(notice).getByRole("button", { name: "Desfazer" }));
    await waitFor(() => expect(names()).toEqual(before));
    await waitFor(() => expect(fake.calls).toContainEqual({ method: "POST", path: "i2/restore", body: null }));
    expect(screen.queryByRole("button", { name: "Desfazer" })).toBeNull();
  });

  it("F-322: «Desfazer» stays at least 10 seconds", () => {
    expect(UNDO_MS).toBeGreaterThanOrEqual(10_000);
  });

  it("F-323: «Editar» opens the name, quantity, unit and category of the item, and saving sends the changes", async () => {
    const fake = lista();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Mais opções de Pão de forma" }));
    await user.click(screen.getByRole("menuitem", { name: "Editar" }));
    const dialog = screen.getByRole("dialog", { name: "Editar produto" });
    const name = within(dialog).getByLabelText("Produto");
    expect(name).toHaveValue("Pão de forma");
    expect(name).toHaveFocus();
    await user.clear(name);
    await user.type(name, "Pão integral");
    await user.clear(within(dialog).getByLabelText("Quantidade"));
    await user.type(within(dialog).getByLabelText("Quantidade"), "2");
    await user.selectOptions(within(dialog).getByLabelText("Categoria"), "mercearia");
    await user.click(within(dialog).getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(fake.calls).toContainEqual({ method: "PATCH", path: "i5", body: { name: "Pão integral", quantity: "2", unit: "un", category: "mercearia" } }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Mais opções de Pão integral" })).toHaveFocus();
  });

  it("F-324: the «i» opens a block that explains the house and where the values come from, with «Fechar»", async () => {
    lista();
    const user = userEvent.setup();
    const info = await screen.findByRole("button", { name: "Como calculamos os valores" });
    expect(info).toHaveAttribute("aria-expanded", "false");
    await user.click(info);
    expect(info).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("heading", { name: "A casinha" })).toBeInTheDocument();
    expect(screen.getByText(/último que pagou por este produto, nos seus talões/)).toBeInTheDocument();
    expect(screen.getByText(/Não são preços de hoje na loja\./)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("heading", { name: "A casinha" })).toBeNull();
  });
});

describe("Lista de compras: G2, ver evolução", () => {
  it("F-325: «Ver evolução» opens the chart and the purchases under the item, and the list stays on the screen", async () => {
    lista();
    const user = userEvent.setup();
    await screen.findByText("Café moído");
    const coffee = row("Café moído");
    const toggle = within(coffee).getByRole("button", { name: /Ver evolução/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(await within(coffee).findByRole("heading", { name: "Evolução do preço" })).toBeInTheDocument();
    const figure = (label: string) => within(coffee).getByText(label).parentElement!.querySelector("dd")!.textContent;
    expect([figure("Esperado"), figure("Última vez"), figure("Menor"), figure("Maior")]).toEqual(["4,94 €", "4,94 €", "3,99 €", "5,89 €"].map((v) => v.replace(" ", " ")));
    const purchases = within(coffee).getByRole("heading", { name: "Compras" }).nextElementSibling as HTMLElement;
    expect(within(purchases).getAllByRole("listitem")).toHaveLength(4);
    expect(purchases.firstElementChild).toHaveTextContent(formatDate("2026-11-01"));
    expect(screen.getByText("Leite meio-gordo")).toBeInTheDocument();
    await user.click(toggle);
    expect(within(coffee).queryByRole("heading", { name: "Evolução do preço" })).toBeNull();
  });

  it("F-326: the period offers 3 and 6 months", async () => {
    lista();
    const user = await openEvolution("Café moído");
    const group = await screen.findByRole("radiogroup", { name: "Período" });
    expect(within(group).getByRole("radio", { name: "6 meses" })).toBeChecked();
    await user.click(within(group).getByRole("radio", { name: "3 meses" }));
    expect(within(group).getByRole("radio", { name: "3 meses" })).toBeChecked();
  });

  it("F-327: the legend names the supermarkets of the purchases, all the person's own", async () => {
    lista();
    await openEvolution("Café moído");
    const legend = await screen.findByRole("list", { name: "Legenda" });
    expect(within(legend).getByText("Suas compras · Lidl")).toBeInTheDocument();
  });

  it("F-328: with no data there is the stamp «Sem informação», the value is «—» and there is no «Ver evolução»", async () => {
    lista();
    await screen.findByText("Pão de forma");
    const bread = within(row("Pão de forma"));
    expect(bread.getByText("Sem informação")).toBeInTheDocument();
    expect(bread.getByLabelText("Sem valor")).toHaveTextContent("—");
    expect(bread.queryByRole("button", { name: /Ver evolução/ })).toBeNull();
    expect(document.querySelectorAll("main [role=img][aria-label^=Preço]").length).toBe(0);
  });

  it("F-329: the same data is offered as a table for those who do not see the chart", async () => {
    lista();
    await openEvolution("Café moído");
    expect(await screen.findByText("Ver como tabela")).toBeInTheDocument();
  });
});

describe("Lista de compras: G5, adicionar", () => {
  it("F-330: the floating «Adicionar» opens a modal sheet with the focus on «Produto»; Esc closes it and the focus goes back", async () => {
    lista();
    const user = userEvent.setup();
    const button = (await screen.findAllByRole("button", { name: "Adicionar" }))[0]!;
    await user.click(button);
    const dialog = screen.getByRole("dialog", { name: "Adicionar à lista" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(within(dialog).getByLabelText("Produto")).toHaveFocus();
    // The focus stays inside: Shift+Tab from the first control goes to the last one.
    await user.tab({ shift: true });
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(button).toHaveFocus();
  });

  it("F-331: adding a product puts it on the list, keeps the sheet open for more, and «Já tenho em casa» sets that state", async () => {
    const fake = lista();
    const user = userEvent.setup();
    await user.click((await screen.findAllByRole("button", { name: "Adicionar" }))[0]!);
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Produto"), "Bananas");
    await user.click(within(dialog).getByRole("checkbox", { name: "Já tenho em casa" }));
    await user.click(within(dialog).getByRole("button", { name: "Adicionar" }));
    await waitFor(() => expect(fake.calls).toContainEqual({ method: "POST", path: "items", body: { name: "Bananas", quantity: 1, already_have: true } }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Produto")).toHaveValue("");
    await user.click(within(dialog).getByRole("button", { name: "Concluído" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(await screen.findByText("Bananas", { selector: "span" })).toBeInTheDocument();
  });

  it("F-332: «Para a próxima compra» offers what the person usually buys, one tap each, and an added one leaves the section", async () => {
    serveConfig({ app_name: "Super Mercado", smart_list_enabled: true });
    const fake = shoppingListFake();
    fake.state.suggestions = [
      { product_id: "p-yoghurt", name: "Iogurte natural", category: "laticinios_ovos", category_name: "Laticínios e ovos" },
      { product_id: "p-bananas", name: "Bananas", category: "frutas_legumes", category_name: "Frutas e legumes" },
    ];
    server.use(...fake.handlers);
    renderRoutes(routes, "/lista");
    const user = userEvent.setup();
    await user.click((await screen.findAllByRole("button", { name: "Adicionar" }))[0]!);
    const dialog = screen.getByRole("dialog");
    expect(await within(dialog).findByRole("heading", { name: "Para a próxima compra" })).toBeInTheDocument();
    expect(within(dialog).getByText("Produtos que costuma comprar por esta altura.")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Iogurte natural" }));
    await waitFor(() => expect(fake.calls).toContainEqual({ method: "POST", path: "items", body: { name: "Iogurte natural", quantity: 1, already_have: false, product_id: "p-yoghurt" } }));
    expect(within(dialog).queryByRole("button", { name: "Iogurte natural" })).toBeNull();
    expect(within(dialog).getByRole("button", { name: "Bananas" })).toBeInTheDocument();
  });

  it("F-333: without suggestions the section is not shown", async () => {
    lista();
    const user = userEvent.setup();
    await user.click((await screen.findAllByRole("button", { name: "Adicionar" }))[0]!);
    expect(screen.queryByRole("heading", { name: "Para a próxima compra" })).toBeNull();
  });
});

describe("Lista de compras: qualidade", () => {
  it("F-335: no banned word, no comparison, no field for the price seen in the shop", async () => {
    lista();
    await screen.findByText("Leite meio-gordo");
    const text = document.querySelector("main")!.textContent ?? "";
    expect(text).not.toMatch(FORBIDDEN);
    expect(screen.queryByLabelText(/preço (visto|na loja)/i)).toBeNull();
  });

  it("F-337: ticking, removing and undoing are announced", async () => {
    serveConfig({ app_name: "Super Mercado", smart_list_enabled: true });
    server.use(...shoppingListFake().handlers);
    renderRoutes(
      [
        {
          path: "/lista",
          element: (
            <AnnounceProvider>
              <ListaPage />
            </AnnounceProvider>
          ),
        },
      ],
      "/lista",
    );
    const user = userEvent.setup();
    await user.click(await screen.findByRole("checkbox", { name: "Leite meio-gordo" }));
    await waitFor(() => expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent("Leite meio-gordo no carrinho."));
    await user.click(screen.getByRole("button", { name: "Mais opções de Leite meio-gordo" }));
    await user.click(screen.getByRole("menuitem", { name: "Excluir da lista" }));
    await waitFor(() => expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent("Leite meio-gordo removido da lista."));
  });

  it("F-339: the screen says «supermercado» wherever it names a shop, never «mercado»", async () => {
    lista();
    await screen.findByText("Leite meio-gordo");
    expect(document.querySelector("main")!.textContent).not.toMatch(/(^|[^a-z])mercados?([^a-z]|$)/i);
    expect(screen.getByText("Supermercado")).toBeInTheDocument();
  });
});
