import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { routes } from "../../App";
import { currentDestinations, nav } from "../../test/nav";
import { renderRoutes } from "../../test/render";
import { serveConfig } from "../../test/server";

const FORBIDDEN = /mais barato|poupou|poupar|orçamento|você|inteligente|sugest|recomend|previs/i;

describe("Lista provisória (spec 015, F-146)", () => {
  it("F-146: with the smart list on, /lista says «em breve», in the nav and with the same title as the other screens", async () => {
    serveConfig({ app_name: "Super Mercado", smart_list_enabled: true });
    renderRoutes(routes, "/lista");
    expect(await screen.findByRole("heading", { level: 1, name: "Lista" })).toBeInTheDocument();
    expect(screen.getByText("Em breve")).toBeInTheDocument();
    expect(within(nav()).getByRole("link", { name: "Lista" })).toBeInTheDocument();
    expect(currentDestinations()).toEqual(["Lista"]);
  });

  it("F-146: it promises no feature and has no control", async () => {
    serveConfig({ app_name: "Super Mercado", smart_list_enabled: true });
    renderRoutes(routes, "/lista");
    await screen.findByRole("heading", { level: 1, name: "Lista" });
    expect(document.querySelector("main")?.textContent).not.toMatch(FORBIDDEN);
    expect(within(document.querySelector("main")!).queryAllByRole("button")).toHaveLength(0);
    expect(within(document.querySelector("main")!).queryAllByRole("link")).toHaveLength(0);
  });

  it("F-146: with the smart list off, /lista is still the «page not found» screen (F-98)", async () => {
    serveConfig({ app_name: "Super Mercado", smart_list_enabled: false });
    renderRoutes(routes, "/lista");
    expect(await screen.findByText("Não foi possível mostrar esta página")).toBeInTheDocument();
    expect(screen.queryByText("Em breve")).not.toBeInTheDocument();
  });

  it("F-146: it writes nothing to localStorage or sessionStorage", async () => {
    serveConfig({ app_name: "Super Mercado", smart_list_enabled: true });
    renderRoutes(routes, "/lista");
    await screen.findByRole("heading", { level: 1, name: "Lista" });
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});
