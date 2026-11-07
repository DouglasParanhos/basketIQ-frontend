import { screen, waitFor, within } from "@testing-library/react";
import { lazy } from "react";
import { delay, http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { nav } from "../test/nav";
import { renderRoutes } from "../test/render";
import { API, failConfig, server, serveConfig } from "../test/server";
import { AppShell, useHideNav } from "./AppShell";

const shell = [{ path: "*", element: <AppShell /> }];
const FOUR = ["Início", "Talões", "Adicionar talão", "Definições"];
const FIVE = ["Início", "Talões", "Adicionar talão", "Lista", "Definições"];

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
    ["/adicionar", "Adicionar talão"],
    ["/definicoes", "Definições"],
  ])("F-90: %s marks only %s as the current destination", (path, label) => {
    renderRoutes(shell, path);
    const current = within(nav()).getAllByRole("link").filter((link) => link.getAttribute("aria-current") === "page");
    expect(current.map((link) => link.textContent)).toEqual([label]);
  });
});

describe("bottom navigation: the approved design (canvas NavBar)", () => {
  const links = () => within(nav()).getAllByRole("link");
  const strokeOf = (link: HTMLElement) => link.querySelector("svg")!.getAttribute("stroke-width");

  it("only the current destination has aria-current; the others do not carry the attribute at all", () => {
    renderRoutes(shell, "/compras");
    const current = links().filter((l) => l.hasAttribute("aria-current"));
    expect(current.map((l) => l.textContent)).toEqual(["Talões"]);
    expect(current[0]).toHaveAttribute("aria-current", "page");
  });

  it("the current destination has the pill behind a thicker icon; the others have neither", () => {
    renderRoutes(shell, "/definicoes");
    for (const link of links()) {
      const active = link.textContent === "Definições";
      expect(link.querySelector(".bg-brand-pill") !== null, link.textContent ?? "").toBe(active);
      if (link.textContent !== "Adicionar talão") expect(strokeOf(link), link.textContent ?? "").toBe(active ? "2.2" : "1.8");
    }
  });

  it("«Adicionar talão» is a link with that accessible name, to /adicionar, and keeps its green button when it is the current page", () => {
    renderRoutes(shell, "/adicionar");
    const add = within(nav()).getByRole("link", { name: "Adicionar talão" });
    expect(add).toHaveAttribute("href", "/adicionar");
    expect(add).toHaveAttribute("aria-current", "page");
    expect(add.querySelector(".bg-brand")).not.toBeNull();
    expect(add.querySelector(".bg-brand-pill")).toBeNull();
  });
});

describe("lazy pages inside the shell (spec 010, R14)", () => {
  it("F-115: the navigation bar stays while a lazy page is still loading", async () => {
    const Pending = lazy(() => new Promise<never>(() => undefined));
    renderRoutes([{ element: <AppShell />, children: [{ path: "/", element: <Pending /> }] }], "/");
    const bar = await screen.findByRole("navigation", { name: "Navegação principal" });
    expect(within(bar).getByRole("link", { name: "Início" })).toBeInTheDocument();
    expect(await screen.findByRole("status")).toHaveTextContent("A carregar");
  });
});

describe("useHideNav", () => {
  const Screen = ({ active }: { active?: boolean }) => {
    useHideNav(active);
    return <p>ecrã</p>;
  };
  const withScreen = (active?: boolean) => [{ path: "*", element: <AppShell />, children: [{ path: "*", element: <Screen active={active} /> }] }];

  it("takes the bar away while active, and by default", async () => {
    serveConfig({ app_name: "Super Mercado" });
    renderRoutes(withScreen(), "/");
    expect(await screen.findByText("ecrã")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Navegação principal" })).toBeNull();
  });

  it("keeps the bar when it is not active", async () => {
    serveConfig({ app_name: "Super Mercado" });
    renderRoutes(withScreen(false), "/");
    expect(await screen.findByText("ecrã")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Navegação principal" })).toBeInTheDocument();
  });
});
