import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { overviewGreen, overviewTwoReds, overviewZeroMonth } from "../../test/fixtures";
import { PurchasesCard, SpendCards } from "./SpendCards";

const plain = (s: string | null) => (s ?? "").replace(/\u00a0/g, " ");

function cards(overview = overviewGreen, isCurrentMonth = true) {
  return render(
    <MemoryRouter>
      <PurchasesCard overview={overview} isCurrentMonth={isCurrentMonth} />
      <SpendCards overview={overview} />
    </MemoryRouter>,
  );
}
const region = (name: string) => screen.getByRole("region", { name });

describe("spending cards of the Início (spec 011, US4)", () => {
  it("F-186: the purchases of the month and the previous month; «Mês passado» in the current month, «Mês anterior» in the others", () => {
    const view = cards();
    expect(plain(region("Compras no mês").textContent)).toContain("7");
    expect(plain(region("Compras no mês").textContent)).toContain("Mês passado: 11");
    view.unmount();
    cards(overviewGreen, false);
    expect(plain(region("Compras no mês").textContent)).toContain("Mês anterior: 11");
    expect(plain(region("Compras no mês").textContent)).not.toContain("Mês passado");
  });

  it("F-186: the spending per week shows each week's days and value, has no weekly average, and its table adds up to the month", async () => {
    cards();
    const weeks = region("Gasto por semana");
    expect(plain(weeks.textContent)).toContain("Sem. 1");
    expect(plain(weeks.textContent)).toContain("1–7 out.");
    expect(plain(weeks.textContent)).toContain("29–31 out.");
    expect(plain(weeks.textContent)).toContain("19,00 €");
    expect(plain(weeks.textContent)).not.toMatch(/média por semana|média de/i);
    await userEvent.setup().click(within(weeks).getByText("Ver como tabela"));
    const table = within(weeks).getByRole("table", { name: "Gasto por semana" });
    const values = within(table).getAllByRole("row").slice(1).map((r) => plain(within(r).getAllByRole("cell")[1]!.textContent));
    expect(values).toEqual(["19,00 €", "58,00 €", "31,00 €", "32,00 €", "12,00 €"]);
    // The weeks add up to the spending of the month: 152,00 €.
    expect(overviewGreen.weeks.reduce((sum, w) => sum + w.spent_cents, 0)).toBe(overviewGreen.spent_cents);
  });

  it("F-186: «Onde gasta mais» keeps the order of the API and writes initial, name, value and percentage in text", () => {
    cards();
    const list = within(region("Onde gasta mais")).getAllByRole("listitem");
    expect(list.map((li) => plain(li.textContent))).toEqual(["PPingo Doce62,00 €41 %", "LLidl50,00 €33 %", "MMercadona40,00 €26 %"]);
  });

  it("approved design: Continente and Auchan, which share a red, sit side by side in the bar and the legend and are told apart by shape and letters", () => {
    cards(overviewTwoReds);
    const card = region("Onde gasta mais");
    const bar = card.querySelector('[aria-hidden="true"]')!;
    const [continente, auchan] = Array.from(bar.children) as HTMLElement[];
    // Continente: solid red with a white «C». Auchan: light with a red border and «AU».
    expect(continente).toHaveTextContent("C");
    expect(continente).toHaveStyle({ background: "#E30613", color: "#FFFFFF" });
    expect(auchan).toHaveTextContent("AU");
    expect(auchan).toHaveStyle({ background: "#F4F3EF", color: "#DF0613", borderColor: "#DF0613" });
    // The segments are proportional to the share; the legend says every name, value and share in words.
    expect(continente).toHaveStyle({ flex: "38 1 0" });
    expect(auchan).toHaveStyle({ flex: "24 1 0" });
    const list = within(card).getAllByRole("listitem");
    expect(list.map((li) => plain(li.textContent))).toEqual(["CContinente57,76 €38 %", "AUAuchan36,48 €24 %", "PPingo Doce33,44 €22 %", "LLidl24,32 €16 %"]);
    expect(overviewTwoReds.by_merchant.reduce((sum, m) => sum + m.share_pct, 0)).toBe(100);
  });

  it("F-186: the latest purchases show the store, the date and the total; the ones not confirmed say so in words and have a dash for a missing total", () => {
    cards();
    const recent = region("Últimas compras");
    const items = within(recent).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(plain(items[0]!.textContent)).toContain("A aguardar");
    expect(plain(items[0]!.textContent)).toContain("—");
    expect(plain(items[1]!.textContent)).toContain("Revisão necessária");
    expect(plain(items[2]!.textContent)).toContain("Pingo Doce");
    expect(plain(items[2]!.textContent)).toContain("27 out.");
    expect(plain(items[2]!.textContent)).toContain("41,20 €");
    expect(within(items[2]!).queryByText(/aguardar|revisão|extrair|validar|pronta/i)).toBeNull(); // confirmed: no badge
    expect(within(recent).getByRole("link", { name: "Ver todas" })).toHaveAttribute("href", "/compras");
    expect(within(items[2]!).getByRole("link")).toHaveAttribute("href", "/compras/c3");
  });

  it("F-186: a month without purchases says so instead of drawing empty cards", () => {
    cards(overviewZeroMonth);
    expect(plain(region("Compras no mês").textContent)).toContain("0");
    expect(plain(region("Onde gasta mais").textContent)).toContain("Sem compras confirmadas neste mês.");
    expect(plain(region("Últimas compras").textContent)).toContain("Sem compras neste mês.");
  });

  it("F-186: nothing of the later specs or of the prototype is on the screen", () => {
    cards();
    expect(document.body.textContent).not.toMatch(/lista inteligente|mesmo produto|mais barato|poupou|mais comprados|acumulado/i);
  });
});
