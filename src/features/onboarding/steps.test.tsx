import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { servePatch, serveProfile } from "../../test/server";
import { allDone, BANNED, openOnboarding, press, title } from "./testing";

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
      if (step < 4) await press(user, "Avançar");
    }
    await press(user, "Concluir");
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
    await press(user, "Avançar");
    const lidl = await screen.findByRole("checkbox", { name: "Lidl" });
    expect(lidl).not.toBeChecked();
    await user.click(lidl);
    expect(lidl).toBeChecked();
    // Each merchant card also shows a tick inside, so the state does not depend on colour alone.
    expect(lidl.closest("label")?.querySelector("svg")).not.toBeNull();
  });

  it("F-117: the people control has names and announces its value", async () => {
    const { user } = await openOnboarding();
    await press(user, "Avançar");
    const value = screen.getByRole("status");
    expect(value).toHaveAttribute("aria-live", "polite");
    expect(value).toHaveTextContent("2 pessoas");
    await press(user, "Mais uma pessoa");
    expect(value).toHaveTextContent("3 pessoas");
    expect(screen.getByRole("button", { name: "Menos uma pessoa" })).toBeEnabled();
  });

  it("F-117: the goal bar has a name and a spoken value, and «Ainda não sei» switches it off", async () => {
    const { user } = await openOnboarding();
    for (let i = 0; i < 3; i++) await press(user, "Avançar");
    const bar = screen.getByRole("slider", { name: "Meta pessoal mensal, em euros" });
    expect(bar).toHaveAttribute("aria-valuetext", "300 euros");
    fireEvent.change(bar, { target: { value: "420" } });
    expect(bar).toHaveAttribute("aria-valuetext", "420 euros");
    await press(user, "Ainda não sei");
    expect(bar).toBeDisabled();
  });

  it("F-117: no text of the Brazilian prototype, of «orçamento» or of savings reaches any step", async () => {
    const { user } = await openOnboarding();
    const texts: string[] = [];
    for (let i = 0; i < 4; i++) {
      await within(document.body).findByRole("heading", { level: 1 });
      texts.push(document.body.textContent ?? "");
      if (i < 3) await press(user, "Avançar");
    }
    await press(user, "Concluir");
    await allDone();
    texts.push(document.body.textContent ?? "");
    for (const text of texts) expect(text).not.toMatch(BANNED);
  });
});
