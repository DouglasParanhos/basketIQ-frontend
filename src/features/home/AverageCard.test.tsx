import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { overviewFewData, overviewGreen, overviewNoTrend, overviewOrange, overviewRed } from "../../test/fixtures";
import { AverageCard } from "./AverageCard";

const card = () => screen.getByRole("region", { name: "Média mensal" });
const text = () => card().textContent!.replace(/\u00a0/g, " ");

describe("monthly average card (spec 011, US2)", () => {
  it("F-184: below the average shows the value and says «abaixo» in words, on the same neutral card", () => {
    render(<AverageCard overview={overviewGreen} />);
    expect(text()).toContain("318,00 €");
    expect(text()).toContain("Últimos 2 meses: 7 % abaixo da média");
    expect(card().className).toContain("bg-paper");
  });

  it("F-184: above the average says «acima» on the same neutral card: no red, no green, no alarm icon", () => {
    render(<AverageCard overview={overviewRed} />);
    expect(text()).toContain("Últimos 2 meses: 12 % acima da média");
    expect(card().className).toContain("bg-paper");
    expect(card().className).not.toMatch(/bg-(ok|alert)-soft/);
    expect(card().querySelector("svg")).toBeNull();
  });

  it("F-184: on target says «na média» (the client applies no threshold)", () => {
    render(<AverageCard overview={overviewOrange} />);
    expect(text()).toContain("Últimos 2 meses: na média");
    expect(card().className).not.toMatch(/bg-(ok|alert)-soft/);
  });

  it("F-184: with an average but no trend it says when the trend appears, with no coloured background", () => {
    render(<AverageCard overview={overviewNoTrend} />);
    expect(text()).toContain("318,00 €");
    expect(text()).toContain("A tendência aparece com mais um mês completo de compras.");
    expect(card().className).not.toMatch(/bg-(ok|alert)-soft/);
  });

  it("F-184: without an average the value is «— €» and the card says what is missing, with the minimum from the API", () => {
    render(<AverageCard overview={overviewFewData} />);
    expect(text()).toContain("— €");
    expect(text()).toContain("Aparece com 2 meses de histórico");
    expect(text()).toContain("0/2 meses");
    expect(card().className).not.toMatch(/bg-(ok|alert)-soft/);
  });

  it("F-184: the minimum and the progress come from the answer, not from a constant of the client", () => {
    render(<AverageCard overview={{ ...overviewFewData, average_min_months: 3, average_months: 1 }} />);
    expect(text()).toContain("Aparece com 3 meses de histórico");
    expect(text()).toContain("1/3 meses");
  });

  it("F-184: the number of the trend is the absolute value, never a minus sign", () => {
    render(<AverageCard overview={overviewGreen} />);
    expect(text()).not.toMatch(/-7|−7/);
  });

  it("F-184: the card is the same whatever month is shown: it depends only on the average and the trend", () => {
    const { unmount } = render(<AverageCard overview={overviewGreen} />);
    const current = text();
    unmount();
    render(<AverageCard overview={{ ...overviewGreen, month: "2026-09", spent_cents: 0 }} />);
    expect(text()).toBe(current);
  });
});
