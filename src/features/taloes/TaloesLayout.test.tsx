import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { monthTotals, receiptItem } from "../../test/fixtures";
import { renderRoutes } from "../../test/render";
import { serveMonths, serveReceipts } from "../../test/server";
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

describe("title and year of the Talões (spec 012)", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-31T12:00:00Z") }));
  afterEach(() => vi.useRealTimers());

  it.each(["/compras", "/compras/resumo", "/produtos"])("F-195: %s has the title «Talões» as the only first-level heading", (path) => {
    renderTaloes(path);
    expect(screen.getByRole("heading", { level: 1, name: "Talões" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("F-195: the detail pages have neither the title nor the tabs", () => {
    renderTaloes("/compras/r1");
    expect(screen.queryByRole("heading", { level: 1, name: "Talões" })).not.toBeInTheDocument();
  });

  it("F-195: the year selector exists only in Compras", async () => {
    serveReceipts([[receiptItem({ id: "n", created_at: "2026-10-24T12:00:00Z" })]]);
    const { router } = renderTaloes("/compras");
    expect(await screen.findByRole("combobox", { name: "Ano" })).toBeInTheDocument();
    await router.navigate("/compras/resumo");
    await waitFor(() => expect(screen.queryByRole("combobox", { name: "Ano" })).not.toBeInTheDocument());
    await router.navigate("/produtos");
    await waitFor(() => expect(screen.queryByRole("combobox", { name: "Ano" })).not.toBeInTheDocument());
  });

  it("F-195: the years are the ones with confirmed purchases, the current one and the default, newest first", async () => {
    serveMonths(monthTotals);
    serveReceipts([[receiptItem({ id: "n", created_at: "2026-10-24T12:00:00Z" })]]);
    renderTaloes("/compras");
    const select = await screen.findByRole("combobox", { name: "Ano" });
    await waitFor(() => expect(within(select).getAllByRole("option").map((o) => o.textContent)).toEqual(["2026", "2025"]));
    expect(select).toHaveValue("2026");
  });

  it("F-195: the default is the year of the purchase sent most recently, even if it is not the current year", async () => {
    serveReceipts([[receiptItem({ id: "n", purchase_at: "2025-12-30T10:00:00Z", created_at: "2026-01-02T10:00:00Z" })]]);
    renderTaloes("/compras");
    const select = await screen.findByRole("combobox", { name: "Ano" });
    await waitFor(() => expect(select).toHaveValue("2025"));
  });

  it("F-195: choosing a year puts it in the URL with replace; choosing the default takes it out; other tabs do not carry it", async () => {
    serveReceipts([[receiptItem({ id: "n", created_at: "2026-10-24T12:00:00Z" })]]);
    const { router, user } = renderTaloes("/compras");
    const select = await screen.findByRole("combobox", { name: "Ano" });
    await waitFor(() => expect(within(select).getAllByRole("option").length).toBeGreaterThan(1));
    await user.selectOptions(select, "2025");
    expect(router.state.location.search).toBe("?ano=2025");
    expect(router.state.historyAction).toBe("REPLACE");
    await user.selectOptions(select, "2026");
    expect(router.state.location.search).toBe("");
    await user.selectOptions(select, "2025");
    await user.click(screen.getByRole("tab", { name: "Resumo" }));
    expect(router.state.location.search).toBe("");
  });

  it.each(["?ano=abc", "?ano=1999", "?ano=2100", "?ano=20"])("F-195: %s in the URL is ignored", async (search) => {
    serveReceipts([[receiptItem({ id: "n", created_at: "2026-10-24T12:00:00Z" })]]);
    renderTaloes(`/compras${search}`);
    const select = await screen.findByRole("combobox", { name: "Ano" });
    await waitFor(() => expect(select).toHaveValue("2026"));
  });
});
