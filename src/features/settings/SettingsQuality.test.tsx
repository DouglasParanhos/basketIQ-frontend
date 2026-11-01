import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { routes } from "../../App";
import { renderRoutes } from "../../test/render";

/** Words of the Brazilian prototype and of what the v1 does not have (contracts/copy.md). */
const BANNED = /você|dá para|lembretes|ajusta as comparações|versão 1\.0|economizar|poupar|orçamento|excedeu/i;

async function open(url: string, heading: string, level: 1 | 2 = 1) {
  const view = { ...renderRoutes(routes, url), user: userEvent.setup() };
  await screen.findByRole("heading", { level, name: heading });
  return view;
}

describe("settings quality (spec 014, US6)", () => {
  it("F-194: no banned word on any tab or on the delete screen", async () => {
    for (const [url, heading, level] of [
      ["/definicoes/perfil", "Perfil", 2],
      ["/definicoes/privacidade", "Originais dos talões", 2],
      ["/definicoes/conta", "Eliminar conta", 2],
      ["/definicoes/conta/eliminar", "Eliminar conta", 1],
    ] as const) {
      const view = await open(url, heading, level);
      expect(document.body.textContent, url).not.toMatch(BANNED);
      view.unmount();
    }
  });

  it("F-194: no banned word while editing the profile", async () => {
    const { user } = await open("/definicoes/perfil", "Perfil", 2);
    await user.click(screen.getByRole("button", { name: "Editar objetivos" }));
    await screen.findByRole("heading", { level: 1, name: "Editar perfil" });
    await screen.findByRole("checkbox", { name: "Lidl" });
    expect(document.body.textContent).not.toMatch(BANNED);
  });

  it("F-194: a chosen merchant or goal is shown by a tick as well as by the frame", async () => {
    const { user } = await open("/definicoes/perfil", "Perfil", 2);
    await user.click(screen.getByRole("button", { name: "Editar mercados" }));
    const lidl = (await screen.findByRole("checkbox", { name: "Lidl" })).closest("label")!;
    const aldi = screen.getByRole("checkbox", { name: "Aldi" }).closest("label")!;
    expect(lidl.querySelector("svg")).not.toBeNull();
    expect(aldi.querySelector("svg")).toBeNull();
    await user.click(screen.getByRole("checkbox", { name: "Aldi" }));
    expect(aldi.querySelector("svg")).not.toBeNull();
  });

  it("F-194: nothing reaches localStorage or sessionStorage on any tab", async () => {
    for (const [url, heading] of [
      ["/definicoes/perfil", "Perfil"],
      ["/definicoes/privacidade", "Originais dos talões"],
      ["/definicoes/conta", "Eliminar conta"],
    ] as const) {
      const view = await open(url, heading, 2);
      view.unmount();
    }
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});
