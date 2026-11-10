import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { monthTotals, receiptItem } from "../../test/fixtures";
import { renderRoutes } from "../../test/render";
import { API, serveMonths, serveReceipts, server } from "../../test/server";
import { ReceiptsPage } from "./ReceiptsPage";

// «Today» for the year of the selector: fixed, so the tests do not depend on the calendar.
beforeEach(() => vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-31T12:00:00Z") }));
afterEach(() => vi.useRealTimers());

const routes = [
  { path: "/compras", element: <ReceiptsPage /> },
  { path: "/compras/:id", element: <p>detalhe da compra</p> },
  { path: "/adicionar", element: <p>adicionar</p> },
];
const plain = (s: string | null) => (s ?? "").replace(/\u00a0/g, " ");
const open = (url = "/compras") => renderRoutes(routes, url);
const rowOf = (name: string | RegExp) => screen.getByRole("link", { name }) as HTMLElement;

/** Purchases of October 2026 in the order the API sends them (by sending), one of each state. */
const october = [
  receiptItem({ id: "p", status: "EXTRACTING", merchant: "CONTINENTE", purchase_at: null, total_cents: null, created_at: "2026-10-29T09:00:00Z", line_count: 0 }),
  receiptItem({ id: "a", status: "REVIEW_REQUIRED", merchant: "MERCADONA", purchase_at: "2026-10-28T10:00:00Z", total_cents: 2275, line_count: 11, needs_action: true, created_at: "2026-10-28T12:00:00Z" }),
  receiptItem({ id: "c", status: "CONFIRMED", merchant: "PINGO_DOCE", purchase_at: "2026-10-27T10:00:00Z", total_cents: 4120, line_count: 14, created_at: "2026-10-27T12:00:00Z" }),
  receiptItem({ id: "e", status: "UNREADABLE", merchant: null, purchase_at: null, total_cents: null, created_at: "2026-10-26T09:00:00Z", line_count: 0, needs_action: true }),
  receiptItem({ id: "o", status: "CONFIRMED", merchant: "LIDL", purchase_at: "2026-10-24T10:00:00Z", total_cents: 100, line_count: 1, created_at: "2026-10-24T12:00:00Z" }),
];

describe("list of purchases (spec 012, US1)", () => {
  it("F-195: groups by month with the count and total of the endpoint of totals, which are not the sum of what is loaded", async () => {
    serveReceipts([[...october, receiptItem({ id: "s", purchase_at: "2026-09-12T10:00:00Z", created_at: "2026-09-12T12:00:00Z" })]]);
    open("/compras?ano=2026");
    expect(await screen.findByRole("heading", { level: 3, name: /Outubro 2026/ })).toBeInTheDocument();
    expect(plain(screen.getByRole("heading", { level: 3, name: /Outubro 2026/ }).textContent)).toBe("Outubro 2026 · 7 confirmados · 248,00 €");
    expect(plain(screen.getByRole("heading", { level: 3, name: /Setembro 2026/ }).textContent)).toBe("Setembro 2026 · 5 confirmados · 322,00 €");
  });

  it("F-195: a month with only purchases still to review, the filter «Requer ação» and a failing endpoint show just the month", async () => {
    serveMonths([{ month: "2026-09", confirmed_count: 1, total_cents: 1 }]);
    serveReceipts([october]);
    const view = open("/compras");
    expect(await screen.findByRole("heading", { level: 3, name: "Outubro 2026" })).toBeInTheDocument();
    view.unmount();

    serveMonths(monthTotals);
    open("/compras?filtro=acao");
    expect(await screen.findByRole("heading", { level: 3, name: "Outubro 2026" })).toBeInTheDocument();
  });

  it("F-195: with the endpoint of totals failing the list still shows, with no totals and no error", async () => {
    serveMonths("error");
    serveReceipts([october]);
    open("/compras");
    expect(await screen.findByRole("heading", { level: 3, name: "Outubro 2026" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("F-195: each state is said with words and an icon, from the status and not from needs_action", async () => {
    serveReceipts([october]);
    open("/compras");
    const attention = await screen.findByRole("link", { name: /Mercadona/ });
    expect(plain(attention.textContent)).toContain("28 out.");
    expect(plain(attention.textContent)).toContain("11 itens");
    expect(plain(attention.textContent)).toContain("Requer ação: rever valores");
    expect(plain(attention.textContent)).toContain("22,75 €");
    expect(within(attention).getByText("!")).toHaveAttribute("aria-hidden", "true");

    const progress = rowOf(/Continente/);
    expect(plain(progress.textContent)).toContain("a ler o talão…");
    expect(plain(progress.textContent)).toContain("—");
    expect(within(progress).getByText("…")).toHaveAttribute("aria-hidden", "true");

    const failed = rowOf(/Nota em processamento/);
    expect(plain(failed.textContent)).toContain("Documento ilegível");
    expect(plain(failed.textContent)).not.toContain("rever valores");
    expect(failed.querySelector("svg[aria-hidden=true]")).not.toBeNull();

    const confirmed = rowOf(/Pingo Doce/);
    expect(plain(confirmed.textContent)).toContain("14 itens");
    expect(plain(confirmed.textContent)).not.toMatch(/rever valores|a ler|!/);
    expect(plain(rowOf(/Lidl/).textContent)).toContain("1 item");
    expect(plain(rowOf(/Lidl/).textContent)).not.toContain("1 itens");
  });

  it("F-195: the badge comes from the status: a confirmed purchase with needs_action true has none", async () => {
    serveReceipts([[receiptItem({ id: "x", status: "CONFIRMED", needs_action: true, merchant: "LIDL" })]]);
    open("/compras");
    const row = await screen.findByRole("link", { name: /Lidl/ });
    expect(within(row).queryByText("!")).not.toBeInTheDocument();
  });

  it("F-195: each row opens the purchase", async () => {
    serveReceipts([october]);
    const { router } = open("/compras");
    await userEvent.setup().click(await screen.findByRole("link", { name: /Pingo Doce/ }));
    expect(router.state.location.pathname).toBe("/compras/c");
  });

  it("F-195: the filters keep their URL and ask for their statuses, and the old link to Produtos is gone", async () => {
    const calls = serveReceipts([october]);
    const user = userEvent.setup();
    open("/compras");
    await screen.findByRole("heading", { level: 3, name: /Outubro/ });
    expect(screen.queryByRole("link", { name: "Produtos" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: /Confirmadas/ }));
    await waitFor(() => expect(calls.some((c) => c.status.join() === "CONFIRMED")).toBe(true));
    expect(screen.getByRole("radio", { name: /Confirmadas/ })).toBeChecked();
  });

  it("F-195: the chip «Requer ação» has the number of purchases that ask for it, up to 99, from a request for 100", async () => {
    const asked: { status: string[]; limit: string | null }[] = [];
    server.use(
      http.get(`${API}/v1/receipts`, ({ request }) => {
        const url = new URL(request.url);
        asked.push({ status: url.searchParams.getAll("status"), limit: url.searchParams.get("limit") });
        const many = url.searchParams.get("limit") === "100" && url.searchParams.getAll("status").length > 1;
        return HttpResponse.json({ items: many ? [receiptItem({ id: "1", status: "REVIEW_REQUIRED" }), receiptItem({ id: "2", status: "REVIEW_REQUIRED" })] : october, next_cursor: null });
      }),
    );
    open("/compras");
    expect(await screen.findByRole("radio", { name: "Requer ação · 2" })).toBeInTheDocument();
    expect(asked.some((a) => a.limit === "100" && a.status.includes("REVIEW_REQUIRED") && a.status.includes("UNREADABLE"))).toBe(true);
  });

  it("F-195: 100 purchases to act on show «99+», and none show just «Requer ação»", async () => {
    server.use(
      http.get(`${API}/v1/receipts`, ({ request }) => {
        const url = new URL(request.url);
        const count = url.searchParams.get("limit") === "100" ? 100 : 0;
        return HttpResponse.json({ items: Array.from({ length: count }, (_, i) => receiptItem({ id: `n${i}`, status: "REVIEW_REQUIRED" })), next_cursor: null });
      }),
    );
    const view = open("/compras");
    expect(await screen.findByRole("radio", { name: "Requer ação · 99+" })).toBeInTheDocument();
    view.unmount();

    server.use(http.get(`${API}/v1/receipts`, () => HttpResponse.json({ items: [], next_cursor: null })));
    open("/compras");
    expect(await screen.findByRole("radio", { name: "Requer ação" })).toBeInTheDocument();
  });

  it("F-195: the list opens on the year of the purchase sent most recently and only shows that year; «Requer ação» shows every year", async () => {
    // Sent in January 2026 but bought in December 2025: that is the first of the list, so 2025 is the year.
    const latest = receiptItem({ id: "n", merchant: "LIDL", purchase_at: "2025-12-30T10:00:00Z", created_at: "2026-01-02T10:00:00Z" });
    const older = receiptItem({ id: "o", merchant: "ALDI", purchase_at: "2025-11-20T10:00:00Z", created_at: "2025-11-21T10:00:00Z" });
    const newer = receiptItem({ id: "y", merchant: "AUCHAN", purchase_at: "2026-01-05T10:00:00Z", created_at: "2026-01-06T10:00:00Z", status: "REVIEW_REQUIRED" });
    serveReceipts([[latest, older, newer]]);
    const view = open("/compras");
    expect(await screen.findByRole("link", { name: /Lidl/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Aldi/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Auchan/ })).not.toBeInTheDocument();
    view.unmount();

    serveReceipts([[latest, older, newer]]);
    open("/compras?filtro=acao");
    expect(await screen.findByRole("link", { name: /Auchan/ })).toBeInTheDocument();
  });

  it("F-195: a year in the URL shows its purchases; an older one that was not reached yet says so and loads more only on «Carregar mais»", async () => {
    const calls = serveReceipts([[receiptItem({ id: "a", merchant: "LIDL", created_at: "2026-10-24T12:00:00Z" })], [receiptItem({ id: "b", merchant: "ALDI", purchase_at: "2025-06-10T10:00:00Z", created_at: "2025-06-11T10:00:00Z" })]]);
    const user = userEvent.setup();
    open("/compras?ano=2025");
    expect(await screen.findByText("Ainda não chegou a este ano.")).toBeInTheDocument();
    expect(calls.filter((c) => c.limit === "20")).toHaveLength(1); // no page was asked for by itself
    await user.click(screen.getByRole("button", { name: "Carregar mais" }));
    expect(await screen.findByRole("link", { name: /Aldi/ })).toBeInTheDocument();
    expect(screen.queryByText("Ainda não chegou a este ano.")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Lidl/ })).not.toBeInTheDocument();
  });

  it("F-195: a year with no purchases and nothing more to load says so", async () => {
    serveReceipts([[receiptItem({ id: "a", created_at: "2026-10-24T12:00:00Z" })]]);
    open("/compras?ano=2024");
    expect(await screen.findByText("Nada nesta lista")).toBeInTheDocument();
    expect(screen.getByText("Não há compras neste ano.")).toBeInTheDocument();
  });

  it("F-195: an account without purchases is invited to add the first one", async () => {
    serveReceipts([[]]);
    open("/compras");
    expect(await screen.findByText("Ainda não há compras")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Adicionar a primeira nota" })).toHaveAttribute("href", "/adicionar");
  });

  it("F-195: the screen has a «Compras» title for assistive technology and no other first-level heading", async () => {
    serveReceipts([october]);
    open("/compras");
    expect(await screen.findByRole("heading", { level: 2, name: "Compras" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });
});

describe("list of purchases that are being read (spec 012, US1)", () => {
  // These need the real clock: the list asks again every 3 seconds while something is being read.
  beforeEach(() => vi.useRealTimers());

  it("F-195: while a purchase is being read the list and the chip number ask again", async () => {
    let asks = 0;
    server.use(
      http.get(`${API}/v1/receipts`, ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("limit") === "100") asks += 1;
        return HttpResponse.json({ items: [receiptItem({ id: "p", status: "EXTRACTING", merchant: "LIDL" })], next_cursor: null });
      }),
    );
    open("/compras");
    await screen.findByRole("link", { name: /Lidl/ });
    await waitFor(() => expect(asks).toBeGreaterThanOrEqual(2), { timeout: 7000 });
  }, 10_000);
});
