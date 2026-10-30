import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderRoutes } from "../../test/render";
import { TaloesLayout } from "./TaloesLayout";

function renderTaloes(initial: string) {
  const { router } = renderRoutes(
    [
      {
        element: <TaloesLayout />,
        children: [
          { path: "/compras", element: <p>página compras</p> },
          { path: "/compras/resumo", element: <p>página resumo</p> },
          { path: "/produtos", element: <p>página produtos</p> },
        ],
      },
      { path: "/compras/:id", element: <p>detalhe da compra</p> },
      { path: "/produtos/:id", element: <p>detalhe do produto</p> },
    ],
    initial,
  );
  return { router, user: userEvent.setup() };
}

const selected = () =>
  screen
    .getAllByRole("tab")
    .filter((tab) => tab.getAttribute("aria-selected") === "true")
    .map((tab) => tab.textContent);

describe("Talões tabs (spec 009)", () => {
  it.each([
    ["/compras", "Compras", "página compras"],
    ["/compras/resumo", "Resumo", "página resumo"],
    ["/compras/resumo/", "Resumo", "página resumo"],
    ["/compras/resumo?de=2026-09-01&ate=2026-09-30", "Resumo", "página resumo"],
    ["/produtos", "Produtos", "página produtos"],
  ])("F-94: %s shows the three tabs with %s selected", (path, tab, page) => {
    renderTaloes(path);
    expect(screen.getByRole("tablist", { name: "Talões" })).toBeInTheDocument();
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Compras", "Resumo", "Produtos"]);
    expect(selected()).toEqual([tab]);
    expect(screen.getByText(page)).toBeInTheDocument();
  });

  it("F-94: activating a tab goes to its plain path and Back returns to the previous one", async () => {
    const { router, user } = renderTaloes("/compras/resumo?de=2026-09-01&ate=2026-09-30");
    await user.click(screen.getByRole("tab", { name: "Produtos" }));
    expect(router.state.location.pathname).toBe("/produtos");
    expect(router.state.location.search).toBe("");
    expect(screen.getByText("página produtos")).toBeInTheDocument();
    expect(selected()).toEqual(["Produtos"]);
    await router.navigate(-1);
    expect(await screen.findByText("página resumo")).toBeInTheDocument();
    expect(router.state.location.search).toBe("?de=2026-09-01&ate=2026-09-30");
    expect(selected()).toEqual(["Resumo"]);
  });

  it.each([
    ["/compras/r1", "detalhe da compra"],
    ["/produtos/p1", "detalhe do produto"],
  ])("F-94: the detail page %s has no tabs", (path, page) => {
    renderTaloes(path);
    expect(screen.getByText(page)).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });
});
