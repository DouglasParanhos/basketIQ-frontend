import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { routes } from "../../App";
import { currentDestinations } from "../../test/nav";
import { renderRoutes } from "../../test/render";

/** The real route table, with the default happy-path API of the tests. */
const renderApp = (initial: string) => ({ ...renderRoutes(routes, initial), user: userEvent.setup() });
const tabs = () => within(screen.getByRole("tablist", { name: "Definições" })).getAllByRole("tab");

describe("settings layout (spec 014, US1)", () => {
  it("F-189: /definicoes goes to the Perfil, replacing the history entry", async () => {
    const { router } = renderApp("/");
    await screen.findByRole("heading", { level: 1, name: "Início" });
    await act(() => router.navigate("/definicoes"));
    expect(await screen.findByRole("heading", { level: 1, name: "Definições" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/definicoes/perfil");
    expect(screen.getByRole("tab", { name: "Perfil", selected: true })).toBeInTheDocument();
    // «Voltar» does not land on /definicoes again (which would redirect once more): it goes to where the person was.
    await act(() => router.navigate(-1));
    expect(router.state.location.pathname).toBe("/");
  });

  it("F-189: the header shows the initial, «Conta Google» and the e-mail, with one <h1>", async () => {
    renderApp("/definicoes/perfil");
    expect(await screen.findByRole("heading", { level: 1, name: "Definições" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByText("Conta Google")).toBeInTheDocument();
    expect(screen.getByText("maria@example.test")).toBeInTheDocument();
    expect(screen.getByText("M")).toBeInTheDocument();
  });

  it("F-189: Perfil · Privacidade · Conta are routes, and the tab follows the path", async () => {
    const { router, user } = renderApp("/definicoes/perfil");
    await screen.findByRole("heading", { level: 1, name: "Definições" });
    expect(tabs().map((tab) => tab.textContent)).toEqual(["Perfil", "Privacidade", "Conta"]);
    await user.click(screen.getByRole("tab", { name: "Privacidade" }));
    expect(router.state.location.pathname).toBe("/definicoes/privacidade");
    expect(screen.getByRole("tab", { name: "Privacidade", selected: true })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Conta" }));
    expect(router.state.location.pathname).toBe("/definicoes/conta");
    expect(screen.getByRole("tab", { name: "Conta", selected: true })).toBeInTheDocument();
  });

  it("F-189: arrows and End move the focus, Enter activates the tab", async () => {
    const { router, user } = renderApp("/definicoes/perfil");
    await screen.findByRole("heading", { level: 1, name: "Definições" });
    act(() => screen.getByRole("tab", { name: "Perfil" }).focus());
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Privacidade" })).toHaveFocus();
    expect(router.state.location.pathname).toBe("/definicoes/perfil");
    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Conta" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(router.state.location.pathname).toBe("/definicoes/conta");
  });

  it("F-189: no weekly reminders switch on any tab", async () => {
    const { user } = renderApp("/definicoes/perfil");
    await screen.findByRole("heading", { level: 1, name: "Definições" });
    for (const name of ["Perfil", "Privacidade", "Conta"]) {
      await user.click(screen.getByRole("tab", { name }));
      expect(screen.queryByText(/lembretes/i)).not.toBeInTheDocument();
      expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    }
  });

  it("F-189: «Definições» stays the current destination on every route under /definicoes, and the footer stays", async () => {
    const { router } = renderApp("/definicoes/conta");
    await screen.findByRole("heading", { level: 1, name: "Definições" });
    expect(currentDestinations()).toEqual(["Definições"]);
    expect(screen.getByText("Super Mercado")).toBeInTheDocument();
    await act(() => router.navigate("/definicoes/privacidade"));
    expect(currentDestinations()).toEqual(["Definições"]);
    expect(screen.getByText("Super Mercado")).toBeInTheDocument();
  });
});

describe("the brand footer of Definições", () => {
  it("ends every tab with the name, the line, the version and the notice about the names, none of it a link", async () => {
    renderApp("/definicoes/perfil");
    const footer = (await screen.findByRole("heading", { level: 1, name: "Definições" })) && document.querySelector("footer")!;
    expect(within(footer).getByText("Super Mercado")).toBeInTheDocument();
    expect(within(footer).getByText("os seus talões")).toBeInTheDocument();
    expect(within(footer).getByText(`v${__APP_VERSION__}`)).toBeInTheDocument();
    expect(within(footer).getByText("Marcas e nomes pertencem aos respetivos titulares. Sem afiliação.")).toBeInTheDocument();
    expect(within(footer).queryAllByRole("link")).toHaveLength(0);
    expect(within(footer).queryAllByRole("button")).toHaveLength(0);
    expect(footer.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
