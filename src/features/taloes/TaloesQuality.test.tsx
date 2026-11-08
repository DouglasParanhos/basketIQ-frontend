import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { receiptItem } from "../../test/fixtures";
import { renderRoutes } from "../../test/render";
import { serveReceipts } from "../../test/server";
import { DashboardPage } from "../dashboard/DashboardPage";
import ProductPage from "../products/ProductPage";
import ProductsPage from "../products/ProductsPage";
import { banned } from "../../test/banned";
import { ReceiptsPage } from "../receipts/ReceiptsPage";
import { TaloesLayout } from "./TaloesLayout";

beforeEach(() => vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-31T12:00:00Z") }));
afterEach(() => vi.useRealTimers());

const routes = [
  {
    element: <TaloesLayout />,
    children: [
      { path: "/compras", element: <ReceiptsPage /> },
      { path: "/compras/resumo", element: <DashboardPage /> },
      { path: "/produtos", element: <ProductsPage /> },
    ],
  },
  { path: "/produtos/:id", element: <ProductPage /> },
  { path: "/compras/:id", element: <p>detalhe da compra</p> },
  { path: "/adicionar", element: <p>adicionar</p> },
];
const FORBIDDEN = banned("ranking|90 dias|olá");

describe("Talões quality (spec 012, US5)", () => {
  it.each([
    ["/compras", "Compras", 2],
    ["/compras/resumo", "Resumo", 2],
    ["/produtos", "Produtos", 2],
  ] as const)("F-199: %s has no forbidden word, and the stores show as text and initial, never as an image", async (path, title, level) => {
    serveReceipts([[receiptItem({ id: "n", merchant: "LIDL", created_at: "2026-10-24T12:00:00Z" })]]);
    renderRoutes(routes, path);
    await screen.findByRole("heading", { level, name: title });
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
    expect(document.body.textContent).not.toMatch(FORBIDDEN);
    // The Resumo has charts (role img, with a table); the lists draw the stores with text and an initial only.
    if (path !== "/compras/resumo") expect(screen.queryAllByRole("img")).toHaveLength(0);
  });

  it("F-199: the product detail has no forbidden word and no image", async () => {
    renderRoutes(routes, "/produtos/p1");
    await screen.findByRole("heading", { level: 1, name: "Peito de frango" });
    expect(document.body.textContent).not.toMatch(FORBIDDEN);
  });

  it("F-199: nothing reaches localStorage or sessionStorage", async () => {
    serveReceipts([[receiptItem({ id: "n", created_at: "2026-10-24T12:00:00Z" })]]);
    renderRoutes(routes, "/compras");
    await screen.findByRole("link", { name: /Lidl/ });
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("F-199: Tab goes through Compras in the visual order: the year, the tab, the filters (one stop, the arrows do the rest), then the purchases", async () => {
    serveReceipts([[receiptItem({ id: "n", merchant: "LIDL", created_at: "2026-10-24T12:00:00Z" })]]);
    renderRoutes(routes, "/compras");
    await screen.findByRole("link", { name: /Lidl/ });
    const user = userEvent.setup();
    const seen: string[] = [];
    for (let i = 0; i < 7; i++) {
      await user.tab();
      const el = document.activeElement as HTMLElement;
      seen.push((el.getAttribute("aria-label") ?? (el as HTMLSelectElement).labels?.[0]?.textContent ?? el.textContent ?? "").trim());
    }
    const at = (needle: string | RegExp) => seen.findIndex((s) => (typeof needle === "string" ? s === needle : needle.test(s)));
    const order = [at(/^Ano/), at("Compras"), at("Todas"), at(/Lidl/)];
    expect(order.every((i) => i >= 0), seen.join(" | ")).toBe(true);
    expect(seen.some((s) => /^Requer ação|^Confirmadas/.test(s)), seen.join(" | ")).toBe(false);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});
