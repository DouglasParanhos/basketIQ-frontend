import { screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { receiptItem } from "../../test/fixtures";
import { renderRoutes } from "../../test/render";
import { serveReceipts } from "../../test/server";
import { TaloesLayout } from "../taloes/TaloesLayout";
import { ReceiptsPage } from "./ReceiptsPage";

beforeEach(() => vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-31T12:00:00Z") }));
afterEach(() => vi.useRealTimers());

const routes = [
  {
    element: <TaloesLayout />,
    children: [
      { path: "/compras", element: <ReceiptsPage /> },
      { path: "/compras/resumo", element: <p>resumo</p> },
    ],
  },
  { path: "/compras/:id", element: <p>detalhe da compra</p> },
];
const open = (url = "/compras") => renderRoutes(routes, url);

const october = [
  receiptItem({ id: "a", status: "REVIEW_REQUIRED", merchant: "MERCADONA", purchase_at: "2026-10-28T10:00:00Z", total_cents: 2275, line_count: 11, needs_action: true, created_at: "2026-10-28T12:00:00Z" }),
  receiptItem({ id: "c", status: "CONFIRMED", merchant: "PINGO_DOCE", purchase_at: "2026-10-27T10:00:00Z", total_cents: 4120, line_count: 14, created_at: "2026-10-27T12:00:00Z" }),
];
const september = receiptItem({ id: "s", status: "CONFIRMED", merchant: "LIDL", purchase_at: "2026-09-12T10:00:00Z", total_cents: 3340, line_count: 1, created_at: "2026-09-12T12:00:00Z" });

describe("Compras on a desk, on sheets of paper (approved design)", () => {
  it("each month is a sheet of paper with the month above it: the rows are links with a chevron, a tile and a dashed line", async () => {
    serveReceipts([[...october, september]]);
    open("/compras?ano=2026");
    const month = await screen.findByRole("heading", { level: 3, name: /Outubro 2026/ });
    const section = month.closest("section")!;
    const sheet = section.querySelector(".torn")!;
    expect(sheet).not.toBeNull();
    // The month is on the desk, outside the sheet; the rows are inside it.
    expect(sheet.contains(month)).toBe(false);
    const rows = within(sheet as HTMLElement).getAllByRole("link");
    expect(rows).toHaveLength(2);
    expect(sheet.querySelector("ul")!.className).toContain("divide-dashed"); // the dashed line is between rows
    for (const row of rows) {
      expect(row.querySelector("svg")).not.toBeNull(); // the chevron
      expect(row.getAttribute("href")).toMatch(/^\/compras\/.+/);
    }
    // One sheet for each month.
    expect(screen.getByRole("heading", { level: 3, name: /Setembro 2026/ }).closest("section")!.querySelector(".torn")).not.toBeNull();
  });

  it("«OS SEUS TALÕES» is only a decoration, and heads the first sheet only", async () => {
    serveReceipts([[...october, september]]);
    open("/compras?ano=2026");
    const first = await screen.findByRole("heading", { level: 3, name: /Outubro 2026/ });
    await screen.findByRole("heading", { level: 3, name: /Setembro 2026/ });
    const label = screen.getByText("OS SEUS TALÕES"); // getByText throws if there is more than one
    expect(label.getAttribute("aria-hidden")).toBe("true");
    expect(first.closest("section")!.contains(label)).toBe(true);
  });

  it("the switch «Ver como papel de talão» is gone: the list is the paper", async () => {
    serveReceipts([october]);
    open("/compras");
    await screen.findByRole("heading", { level: 3, name: /Outubro 2026/ });
    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.queryByText("Ver como papel de talão")).toBeNull();
  });

  it("the old address with ?vista=papel opens the list and loses the parameter, keeping the other filters", async () => {
    serveReceipts([october]);
    const { router } = open("/compras?vista=papel&filtro=acao");
    await screen.findByRole("heading", { level: 3, name: /Outubro 2026/ });
    await waitFor(() => expect(router.state.location.search).toBe("?filtro=acao"));
    expect(screen.queryByRole("region", { name: /papel de talão/ })).toBeNull();
  });

  it("the desk is only behind the list of purchases, not behind the other tabs", async () => {
    serveReceipts([october]);
    const view = open("/compras");
    await screen.findByRole("heading", { level: 3, name: /Outubro 2026/ });
    expect(document.querySelector(".bg-table")).not.toBeNull();
    expect(document.querySelector(".bg-table")!.getAttribute("aria-hidden")).toBe("true");
    view.unmount();
    open("/compras/resumo");
    await screen.findByText("resumo");
    expect(document.querySelector(".bg-table")).toBeNull();
  });
});
