import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { overviewGreen, overviewNoGoal, overviewOrange, overviewOver, overviewRed } from "../../test/fixtures";
import { renderRoutes } from "../../test/render";
import { GoalRing } from "./GoalRing";

// The Brazilian forms are case-sensitive: «A sua meta pessoal» is right, «Sua meta pessoal» is not.
const forbidden = (t: string) => /poupou|poupar|economizar|orçamento|você|excedeu|perdeu/i.test(t) || /Chegando lá|Sua meta/.test(t);

function ring(overview: Parameters<typeof GoalRing>[0]["overview"], isCurrentMonth = true) {
  return renderRoutes([{ path: "/", element: <GoalRing overview={overview} isCurrentMonth={isCurrentMonth} /> }], "/");
}
const text = () => document.body.textContent!.replace(/\u00a0/g, " ");

describe("goal ring (spec 011, US1)", () => {
  it("F-183: each band is an image with a text alternative, and says the band and the balance in words", () => {
    for (const [overview, label, chip] of [
      [overviewGreen, "Anel verde, 38 % da meta usada", "Tranquilo · saldo da meta: 248,00 €"],
      [overviewOrange, "Anel laranja, 62 % da meta usada", "Quase lá · saldo da meta: 152,00 €"],
      [overviewRed, "Anel vermelho, 88 % da meta usada", "Reta final · saldo da meta: 48,00 €"],
    ] as const) {
      const view = ring(overview);
      expect(screen.getByRole("img", { name: label })).toBeInTheDocument();
      expect(text()).toContain(chip);
      view.unmount();
    }
  });

  it("F-183: the spent amount, the goal, the percentage and the fixed note are always on screen", () => {
    ring(overviewGreen);
    expect(text()).toContain("152,00 €");
    expect(text()).toContain("A sua meta pessoal: 400,00 €");
    expect(screen.getByText("38 %")).toBeInTheDocument();
    expect(screen.getByText("Gasto em mercado no mês")).toBeInTheDocument();
    expect(screen.getByText("A meta pessoal é um objetivo seu, não um limite. Pode mudá-la quando quiser.")).toBeInTheDocument();
  });

  it("F-183: above the goal the ring is full, says so, and does not scold", () => {
    ring(overviewOver);
    expect(text()).toContain("Acima da meta pessoal este mês · 52,00 € além da meta");
    expect(screen.getByText("113 %")).toBeInTheDocument();
    expect(forbidden(text())).toBe(false);
  });

  it("F-183: without a goal there is an empty ring, «—», the spent amount and the way to define it in the Perfil", () => {
    ring(overviewNoGoal);
    expect(screen.getByRole("img", { name: "Anel sem meta definida" })).toBeInTheDocument();
    expect(text()).toContain("Sem meta pessoal definida");
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(text()).toContain("248,00 €");
    expect(screen.getByRole("link", { name: "Definir a minha meta pessoal" })).toHaveAttribute("href", "/definicoes/perfil?editar=meta");
    // The note is there too, with or without a goal.
    expect(screen.getByText(/A meta pessoal é um objetivo seu, não um limite\./)).toBeInTheDocument();
  });

  it("F-183: with a goal there is no «Definir» button", () => {
    ring(overviewGreen);
    expect(screen.queryByRole("link", { name: /definir a minha meta/i })).not.toBeInTheDocument();
  });

  it("F-183: in a past month the goal is marked as the current goal, in the text and in the alternative", () => {
    ring(overviewGreen, false);
    expect(screen.getByRole("img", { name: "Anel verde, 38 % da meta atual usada" })).toBeInTheDocument();
    expect(within(screen.getByText(/A sua meta pessoal:/).parentElement!).getByText("Meta atual")).toBeInTheDocument();
  });

  it("F-183: the current month does not say «Meta atual»", () => {
    ring(overviewGreen, true);
    expect(screen.queryByText("Meta atual")).not.toBeInTheDocument();
  });

  it("F-183: the colour is never the only sign: every state has its words and none uses a forbidden one", () => {
    for (const overview of [overviewGreen, overviewOrange, overviewRed, overviewOver, overviewNoGoal]) {
      const view = ring(overview);
      expect(forbidden(text())).toBe(false);
      view.unmount();
    }
  });
});
