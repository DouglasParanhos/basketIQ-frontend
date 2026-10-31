import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { routes } from "./App";
import { currentDestinations, nav } from "./test/nav";
import { renderRoutes } from "./test/render";
import { API, errorBody, server } from "./test/server";

/** The real route table, with the default happy-path API of the tests. */
const renderApp = (initial: string) => ({ ...renderRoutes(routes, initial), user: userEvent.setup() });

describe("route table (spec 009)", () => {
  it("F-97: /compras/resumo is the Resumo, with the Talões tabs and Talões as the current destination", async () => {
    renderApp("/compras/resumo");
    expect(await screen.findByRole("heading", { level: 2, name: "Resumo" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Talões" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Resumo", selected: true })).toBeInTheDocument();
    expect(currentDestinations()).toEqual(["Talões"]);
  });

  it("F-97: / is the Início and /compras/r1 is still the purchase, outside the tabs", async () => {
    const home = renderApp("/");
    expect(await screen.findByRole("heading", { level: 1, name: "Início" })).toBeInTheDocument();
    expect(currentDestinations()).toEqual(["Início"]);
    home.router.navigate("/compras/r1");
    expect(await screen.findByRole("link", { name: "Voltar às compras" })).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(currentDestinations()).toEqual(["Talões"]);
  });

  it("F-97: «resumo» is never taken as the id of a purchase", async () => {
    renderApp("/compras/resumo");
    await screen.findByRole("heading", { level: 2, name: "Resumo" });
    expect(screen.queryByRole("link", { name: "Voltar às compras" })).not.toBeInTheDocument();
  });

  it("F-97: /compras and /produtos have the tabs; a product page does not", async () => {
    server.use(
      http.get(`${API}/v1/products`, () => HttpResponse.json([])),
      http.get(`${API}/v1/products/p1/analytics`, () => HttpResponse.json(errorBody("not_found", "Produto não encontrado."), { status: 404 })),
    );
    const { router } = renderApp("/compras");
    expect(await screen.findByRole("heading", { level: 1, name: "Talões" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 2, name: "Compras" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Compras", selected: true })).toBeInTheDocument();
    await router.navigate("/produtos");
    expect(await screen.findByRole("heading", { level: 2, name: "Produtos" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Talões" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Produtos", selected: true })).toBeInTheDocument();
    await router.navigate("/produtos/p1");
    expect(await screen.findByText("Produto não encontrado.")).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(currentDestinations()).toEqual(["Talões"]);
  });

  it("F-98: /lista and unknown routes show the same «page not found» screen, with a link back to the Início", async () => {
    const { router } = renderApp("/lista");
    expect(await screen.findByText("Não foi possível mostrar esta página")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar ao início" })).toHaveAttribute("href", "/");
    await router.navigate("/xyz");
    expect(await screen.findByText("Não foi possível mostrar esta página")).toBeInTheDocument();
    expect(within(nav()).queryByRole("link", { name: "Lista" })).not.toBeInTheDocument();
  });

  it("F-98: /adicionar is unchanged and /definicoes goes to the Perfil", async () => {
    const { router } = renderApp("/adicionar");
    expect(await screen.findByRole("heading", { level: 1, name: "Adicionar talão" })).toBeInTheDocument();
    expect(currentDestinations()).toEqual(["Adicionar"]);
    await router.navigate("/definicoes");
    expect(await screen.findByRole("heading", { level: 1, name: "Definições" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/definicoes/perfil");
    expect(currentDestinations()).toEqual(["Definições"]);
  });

  it("F-98: Back returns to the previous destination", async () => {
    const { router, user } = renderApp("/");
    await screen.findByRole("heading", { level: 1, name: "Início" });
    await user.click(within(nav()).getByRole("link", { name: "Adicionar" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Adicionar talão" })).toBeInTheDocument();
    await router.navigate(-1);
    expect(await screen.findByRole("heading", { level: 1, name: "Início" })).toBeInTheDocument();
    expect(currentDestinations()).toEqual(["Início"]);
  });
});
