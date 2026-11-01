import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { monthTotals, receiptItem } from "../../test/fixtures";
import { renderRoutes } from "../../test/render";
import { serveMonths, serveReceipts } from "../../test/server";
import { ReceiptsPage } from "./ReceiptsPage";

beforeEach(() => vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-31T12:00:00Z") }));
afterEach(() => vi.useRealTimers());

const routes = [
  { path: "/compras", element: <ReceiptsPage /> },
  { path: "/compras/:id", element: <p>detalhe da compra</p> },
];
const plain = (s: string | null | undefined) => (s ?? "").replace(/\xa0/g, " ");
const open = (url = "/compras") => renderRoutes(routes, url);
const SWITCH = "Ver como papel de talão";

const october = [
  receiptItem({ id: "p", status: "EXTRACTING", merchant: "CONTINENTE", purchase_at: null, total_cents: null, created_at: "2026-10-29T09:00:00Z", line_count: 0 }),
  receiptItem({ id: "a", status: "REVIEW_REQUIRED", merchant: "MERCADONA", purchase_at: "2026-10-28T10:00:00Z", total_cents: 2275, line_count: 11, needs_action: true, created_at: "2026-10-28T12:00:00Z" }),
  receiptItem({ id: "c", status: "CONFIRMED", merchant: "PINGO_DOCE", purchase_at: "2026-10-27T10:00:00Z", total_cents: 4120, line_count: 14, created_at: "2026-10-27T12:00:00Z" }),
  receiptItem({ id: "e", status: "UNREADABLE", merchant: null, purchase_at: null, total_cents: null, created_at: "2026-10-26T09:00:00Z", line_count: 0, needs_action: true }),
];

describe("list as a printed receipt (spec 012, US4)", () => {
  it("F-198: a switch in Compras shows the month on receipt paper, with the same states said in words", async () => {
    serveReceipts([october]);
    const user = userEvent.setup();
    open("/compras");
    const toggle = await screen.findByRole("switch", { name: SWITCH });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(screen.queryByRole("region", { name: "Os seus talões em papel de talão" })).not.toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
    const paper = screen.getByRole("region", { name: "Os seus talões em papel de talão" });
    expect(paper).toHaveClass("receipt-paper");
    expect(within(paper).getByRole("heading", { level: 2, name: "OS SEUS TALÕES" })).toBeInTheDocument();
    expect(within(paper).getByRole("heading", { level: 3, name: "OUTUBRO 2026" })).toBeInTheDocument();

    const attention = within(paper).getByRole("link", { name: /MERCADONA/ });
    expect(plain(attention.textContent)).toContain("28/10");
    expect(plain(attention.textContent)).toContain("Requer ação: REVER");
    expect(plain(attention.textContent)).toContain("22,75 €");
    expect(within(attention).getByText("REVER")).toHaveClass("marker");
    expect(attention).toHaveAttribute("href", "/compras/a");

    expect(plain(within(paper).getByRole("link", { name: /CONTINENTE/ }).textContent)).toContain("a ler…");
    expect(plain(within(paper).getByRole("link", { name: /PINGO DOCE/ }).textContent)).toContain("41,20 €");
    expect(plain(within(paper).getByRole("link", { name: /NOTA EM PROCESSAMENTO/ }).textContent)).toContain("Documento ilegível");
  });

  it("F-198: each month ends with «TOTAL CONFIRMADO» and the total of the endpoint of totals", async () => {
    serveReceipts([october]);
    serveMonths(monthTotals);
    open("/compras?vista=papel");
    const paper = await screen.findByRole("region", { name: "Os seus talões em papel de talão" });
    const total = await within(paper).findByText("TOTAL CONFIRMADO");
    expect(plain(total.parentElement?.textContent)).toBe("TOTAL CONFIRMADO248,00 €");
  });

  it("F-198: with «Requer ação» there is no total, and the switch goes back to the list", async () => {
    serveReceipts([october]);
    const user = userEvent.setup();
    open("/compras?vista=papel&filtro=acao");
    const paper = await screen.findByRole("region", { name: "Os seus talões em papel de talão" });
    expect(within(paper).queryByText("TOTAL CONFIRMADO")).not.toBeInTheDocument();

    await user.click(screen.getByRole("switch", { name: SWITCH }));
    expect(screen.queryByRole("region", { name: "Os seus talões em papel de talão" })).not.toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 3, name: "Outubro 2026" })).toBeInTheDocument();
  });
});
