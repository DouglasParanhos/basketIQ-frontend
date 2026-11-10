import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { THEME_KEY } from "../../lib/theme";
import { renderRoutes } from "../../test/render";
import { DashboardPage } from "./DashboardPage";

const routes = [{ path: "/compras/resumo", element: <DashboardPage /> }];
const open = () => renderRoutes(routes, "/compras/resumo?periodo=month&de=2026-09-01&ate=2026-09-30");

afterEach(() => {
  vi.restoreAllMocks();
  delete document.documentElement.dataset.theme;
  localStorage.clear();
});

describe("Relatório para imprimir (Passo B)", () => {
  it("F-259: «Imprimir ou guardar em PDF» opens the print dialog of the browser", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    open();
    await userEvent.setup().click(await screen.findByRole("button", { name: "Imprimir ou guardar em PDF" }));
    expect(print).toHaveBeenCalledTimes(1);
  });

  it("F-260: the paper says what the report is about and that the figures are not official; the filters are left out of it", async () => {
    open();
    const title = await screen.findByRole("heading", { level: 2, name: /^Resumo de compras · setembro de 2026$/ });
    const header = title.closest("header")!;
    expect(header).toHaveClass("hidden", "print:block");
    expect(header).toHaveTextContent("Todos os supermercados");
    expect(header).toHaveTextContent("Valores dos seus talões confirmados");
    expect(header).toHaveTextContent("Não são preços oficiais dos supermercados.");
    expect(header.textContent).not.toMatch(/poupa|mais barato|ranking/i);
    expect(screen.getByLabelText("Supermercado").closest(".print\\:hidden")).not.toBeNull();
    expect(await screen.findByRole("button", { name: "Imprimir ou guardar em PDF" })).toHaveClass("print:hidden");
  });

  it("F-261: what is printed is the light scheme, whatever the way of printing, and the person's theme comes back afterwards", async () => {
    localStorage.setItem(THEME_KEY, "dark");
    document.documentElement.dataset.theme = "dark";
    open();
    await screen.findByRole("button", { name: "Imprimir ou guardar em PDF" });
    act(() => void window.dispatchEvent(new Event("beforeprint")));
    expect(document.documentElement.dataset.theme).toBe("light");
    act(() => void window.dispatchEvent(new Event("afterprint")));
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
