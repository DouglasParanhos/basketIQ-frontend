import { waitFor, within } from "@testing-library/react";
import { delay, http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { nav } from "../test/nav";
import { renderRoutes } from "../test/render";
import { API, failConfig, server, serveConfig } from "../test/server";
import { AppShell } from "./AppShell";

const shell = [{ path: "*", element: <AppShell /> }];
const FOUR = ["Início", "Talões", "Adicionar", "Definições"];
const FIVE = ["Início", "Talões", "Adicionar", "Lista", "Definições"];

const labels = () => within(nav()).getAllByRole("link").map((link) => link.textContent);

describe("bottom navigation (spec 009)", () => {
  it("F-87: shows five destinations, in order, when the smart-list option is on", async () => {
    serveConfig({ app_name: "Super Mercado", smart_list_enabled: true });
    renderRoutes(shell, "/");
    expect(await within(nav()).findByRole("link", { name: "Lista" })).toBeInTheDocument();
    expect(labels()).toEqual(FIVE);
  });

  it.each([
    ["false", { app_name: "Super Mercado", smart_list_enabled: false }],
    ["missing", { app_name: "Super Mercado" }],
  ])("F-88: shows four destinations when the option is %s", async (_case, body) => {
    serveConfig(body);
    const { client } = renderRoutes(shell, "/");
    await waitFor(() => expect(client.isFetching()).toBe(0)); // the configuration request has settled
    expect(labels()).toEqual(FOUR);
    expect(within(nav()).queryByRole("link", { name: "Lista" })).not.toBeInTheDocument();
  });

  it("F-88: shows four destinations when the request fails, and Lista is not in the tab order", async () => {
    failConfig();
    const { client } = renderRoutes(shell, "/");
    // useAppConfig retries once (about 1 s) before the query settles in error.
    await waitFor(() => expect(client.getQueryState(["app-config"])?.status).toBe("error"), { timeout: 4000 });
    expect(labels()).toEqual(FOUR);
    const tabbable = within(nav()).getAllByRole("link").filter((link) => link.tabIndex >= 0);
    expect(tabbable.map((link) => link.textContent)).toEqual(FOUR);
  });

  it("F-89: starts with four destinations and adds Lista when the configuration arrives with the option on", async () => {
    server.use(
      http.get(`${API}/v1/config`, async () => {
        await delay(60);
        return HttpResponse.json({ app_name: "Super Mercado", smart_list_enabled: true });
      }),
    );
    renderRoutes(shell, "/");
    expect(labels()).toEqual(FOUR);
    expect(await within(nav()).findByRole("link", { name: "Lista" })).toBeInTheDocument();
    expect(labels()).toEqual(FIVE);
  });

  it.each([
    ["/", "Início"],
    ["/compras", "Talões"],
    ["/compras/resumo", "Talões"],
    ["/compras/r1", "Talões"],
    ["/produtos", "Talões"],
    ["/produtos/p1", "Talões"],
    ["/adicionar", "Adicionar"],
    ["/definicoes", "Definições"],
  ])("F-90: %s marks only %s as the current destination", (path, label) => {
    renderRoutes(shell, path);
    const current = within(nav()).getAllByRole("link").filter((link) => link.getAttribute("aria-current") === "page");
    expect(current.map((link) => link.textContent)).toEqual([label]);
  });
});
