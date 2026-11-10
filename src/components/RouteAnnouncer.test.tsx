import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link } from "react-router";
import { describe, expect, it } from "vitest";
import { DocumentTitle } from "../config/appConfig";
import { renderRoutes } from "../test/render";
import { serveConfig } from "../test/server";
import { AnnounceProvider } from "./Announce";
import { AppShell } from "./AppShell";

const routes = [
  {
    element: (
      <AnnounceProvider>
        <DocumentTitle />
        <AppShell />
      </AnnounceProvider>
    ),
    children: [
      { path: "/", element: <Link to="/compras">Ir para as compras</Link> },
      { path: "/compras", element: <Link to="/compras?filtro=acao">Filtrar</Link> },
    ],
  },
];

describe("route change is announced (A-01)", () => {
  it("F-247: the status region says the new title after the path changes", async () => {
    serveConfig({ app_name: "Super Mercado" });
    renderRoutes(routes, "/");
    await userEvent.click(await screen.findByRole("link", { name: "Ir para as compras" }));
    await waitFor(() => expect(screen.getByRole("status", { hidden: false })).toHaveTextContent("Compras · Super Mercado"), { timeout: 2000 });
  });

  it("F-247: nothing is announced when only the query string changes", async () => {
    serveConfig({ app_name: "Super Mercado" });
    const { router } = renderRoutes(routes, "/compras");
    await screen.findByRole("link", { name: "Filtrar" });
    await act(async () => {
      await router.navigate("/compras?filtro=acao");
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("F-248: moves the focus to the content only when the element the person used is gone", async () => {
    serveConfig({ app_name: "Super Mercado" });
    const { router } = renderRoutes(routes, "/");
    await screen.findByRole("link", { name: "Ir para as compras" });
    (document.activeElement as HTMLElement | null)?.blur(); // the link that was used no longer exists: focus is on <body>
    await act(async () => {
      await router.navigate("/compras");
    });
    await waitFor(() => expect(document.getElementById("conteudo")).toHaveFocus(), { timeout: 2000 });

    // With the focus still on a valid element (a link of the bar, a tab), the focus stays where it is.
    const link = screen.getByRole("link", { name: "Filtrar" });
    link.focus();
    await act(async () => {
      await router.navigate("/");
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    expect(document.getElementById("conteudo")).not.toHaveFocus();
  });

  it("F-249: the main region can receive the focus programmatically", async () => {
    serveConfig({ app_name: "Super Mercado" });
    renderRoutes(routes, "/");
    await screen.findByRole("link", { name: "Ir para as compras" });
    expect(document.getElementById("conteudo")).toHaveAttribute("tabindex", "-1");
  });
});
