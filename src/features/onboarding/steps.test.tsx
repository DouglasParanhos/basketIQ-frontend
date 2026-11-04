import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { servePatch, serveProfile } from "../../test/server";
import { advance, allDone, answer, BANNED, openOnboarding, press, title } from "./testing";

beforeEach(() => {
  serveProfile();
  servePatch();
});

describe("accessibility of the onboarding (spec 010, US5)", () => {
  it("F-117: the focus is on the title of each step, and the title is described by «Passo N de 4»", async () => {
    const { user } = await openOnboarding();
    for (const step of [1, 2, 3, 4]) {
      expect(title()).toHaveFocus();
      expect(title()).toHaveAccessibleDescription(`Passo ${step} de 4`);
      if (step < 4) await advance(user, 1, step - 1);
    }
    await advance(user, 1, 3);
    expect(await allDone()).toHaveFocus();
  });

  it("F-117: the progress bar has a name and a value", async () => {
    await openOnboarding();
    const bar = screen.getByRole("progressbar", { name: "Progresso do onboarding" });
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    expect(bar).toHaveAttribute("aria-valuenow", "25");
  });

  it("F-117: goals and merchants are check boxes with a name, and the state is read from `checked`, not from the frame", async () => {
    const { user } = await openOnboarding();
    const goal = screen.getByRole("checkbox", { name: /Organizar as minhas finanças/ });
    expect(goal).not.toBeChecked();
    await user.click(goal);
    expect(goal).toBeChecked();
    expect(goal.closest("label")).not.toBeNull();
    await press(user, "Avançar");
    await advance(user, 1, 1);
    const lidl = await screen.findByRole("checkbox", { name: "Lidl" });
    expect(lidl).not.toBeChecked();
    await user.click(lidl);
    expect(lidl).toBeChecked();
    // Each merchant card also shows a tick inside, so the state does not depend on colour alone.
    expect(lidl.closest("label")?.querySelector("svg")).not.toBeNull();
  });

  it("F-117: the people control has names and announces its value", async () => {
    const { user } = await openOnboarding();
    await advance(user, 1, 0);
    const value = screen.getByRole("status");
    expect(value).toHaveAttribute("aria-live", "polite");
    expect(value).toHaveTextContent("— pessoas");
    await press(user, "Mais uma pessoa");
    expect(value).toHaveTextContent("1 pessoa");
    await press(user, "Mais uma pessoa");
    expect(value).toHaveTextContent("2 pessoas");
    expect(screen.getByRole("button", { name: "Menos uma pessoa" })).toBeEnabled();
  });

  it("F-117: the goal bar has a name and a spoken value, and «Ainda não sei» switches it off", async () => {
    const { user } = await openOnboarding();
    await advance(user, 3);
    const bar = screen.getByRole("slider", { name: "Meta pessoal mensal, em euros" });
    expect(bar).toHaveAttribute("aria-valuetext", "ainda sem valor");
    fireEvent.change(bar, { target: { value: "420" } });
    expect(bar).toHaveAttribute("aria-valuetext", "420 euros");
    await press(user, "Ainda não sei");
    expect(bar).toBeDisabled();
  });

  it("F-113: touching the bar without moving it answers the minimum, so «Avançar» can be used for exactly € 50", async () => {
    const { user } = await openOnboarding();
    await advance(user, 3);
    const bar = screen.getByRole("slider", { name: "Meta pessoal mensal, em euros" });
    expect(screen.getByRole("button", { name: "Concluir" })).toHaveAttribute("aria-disabled", "true");
    await user.click(bar);
    expect(bar).toHaveAttribute("aria-valuetext", "50 euros");
    expect(screen.getByRole("button", { name: "Concluir" })).not.toHaveAttribute("aria-disabled", "true");
  });

  it("F-113: with the keyboard, going down from the minimum (an arrow or Home) answers € 50 without moving the bar", async () => {
    const { user } = await openOnboarding();
    await advance(user, 3);
    const bar = screen.getByRole("slider", { name: "Meta pessoal mensal, em euros" });
    bar.focus();
    await user.keyboard("{ArrowRight}"); // going up is a change of the browser's own: no answer from this handler
    expect(bar).toHaveAttribute("aria-valuetext", "ainda sem valor");
    await user.keyboard("{ArrowLeft}");
    expect(bar).toHaveAttribute("aria-valuetext", "50 euros");
    expect(screen.getByRole("button", { name: "Concluir" })).not.toHaveAttribute("aria-disabled", "true");
  });

  it("F-117: no text of the Brazilian prototype, of «orçamento» or of savings reaches any step", async () => {
    const { user } = await openOnboarding();
    const texts: string[] = [];
    for (let i = 0; i < 4; i++) {
      await within(document.body).findByRole("heading", { level: 1 });
      texts.push(document.body.textContent ?? "");
      await answer(user, i);
      if (i < 3) await press(user, "Avançar");
    }
    await press(user, "Concluir");
    await allDone();
    texts.push(document.body.textContent ?? "");
    for (const text of texts) expect(text).not.toMatch(BANNED);
  });

  it("F-113: «Avançar» without an answer is aria-disabled, says why, does nothing, and stays in the tab order", async () => {
    const { user } = await openOnboarding();
    const next = screen.getByRole("button", { name: "Avançar" });
    expect(next).toHaveAttribute("aria-disabled", "true");
    expect(next).not.toBeDisabled();
    expect(next).toHaveAccessibleDescription("Escolha uma opção para avançar, ou salte este passo.");
    await user.click(next);
    expect(title()).toHaveTextContent("Qual é o seu objetivo com a aplicação?");
    next.focus();
    await user.keyboard("{Enter}");
    expect(title()).toHaveTextContent("Qual é o seu objetivo com a aplicação?");
    await user.click(screen.getByRole("checkbox", { name: /Gastar menos nas compras/ }));
    expect(next).not.toHaveAttribute("aria-disabled");
    expect(next).not.toHaveAttribute("aria-describedby");
    await user.click(next);
    expect(title()).toHaveTextContent("Quantas pessoas vivem em sua casa?");
  });

  it("F-113: each step says what it needs, and «Saltar» is always there and never blocked", async () => {
    const { user } = await openOnboarding();
    const reasons = [
      "Escolha uma opção para avançar, ou salte este passo.",
      "Indique quantas pessoas, ou salte este passo.",
      "Escolha um mercado para avançar, ou salte este passo.",
      "Defina um valor ou toque em «Ainda não sei».",
    ];
    for (const [step, reason] of reasons.entries()) {
      const next = screen.getByRole("button", { name: step === 3 ? "Concluir" : "Avançar" });
      expect(next).toHaveAccessibleDescription(reason);
      expect(screen.getByRole("button", { name: "Saltar" })).toBeEnabled();
      if (step < 3) await press(user, "Saltar");
    }
    await press(user, "Ainda não sei");
    expect(screen.getByRole("button", { name: "Concluir" })).not.toHaveAttribute("aria-disabled");
  });

  it("F-113: nothing is chosen when a step opens: the goals are unmarked, the people are «—», the amount is «— €»", async () => {
    const { user } = await openOnboarding();
    for (const box of screen.getAllByRole("checkbox")) expect(box).not.toBeChecked();
    await press(user, "Saltar");
    expect(screen.getByRole("status")).toHaveTextContent("— pessoas");
    expect(screen.getByRole("button", { name: "Menos uma pessoa" })).toBeDisabled();
    await press(user, "Saltar");
    await press(user, "Saltar");
    expect(screen.getByTestId("goal-value").textContent?.replace(/\s/g, " ")).toBe("— €");
  });
});
