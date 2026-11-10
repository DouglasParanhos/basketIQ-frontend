import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { TEXT_SIZE_KEY } from "../../lib/textSize";
import { THEME_KEY } from "../../lib/theme";
import { AppearanceCard } from "./AppearanceCard";

const radio = (name: string) => screen.getByRole("radio", { name });
const theme = () => document.documentElement.dataset.theme;

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  document.documentElement.style.removeProperty("--text-scale");
});

describe("Aparência (Definições)", () => {
  it("has the three choices in a group, and «Automático» is the one in use at first", () => {
    render(<AppearanceCard />);
    const group = screen.getByRole("radiogroup", { name: "Aparência" });
    expect(within(group).getAllByRole("radio")).toHaveLength(3);
    expect(radio("Automático")).toBeChecked();
    expect(radio("Claro")).not.toBeChecked();
    expect(radio("Escuro")).not.toBeChecked();
  });

  it("choosing «Escuro» applies the dark theme at once and keeps the choice", async () => {
    const user = userEvent.setup();
    render(<AppearanceCard />);
    await user.click(radio("Escuro"));
    expect(theme()).toBe("dark");
    expect(localStorage.getItem(THEME_KEY)).toBe("dark");
    expect(radio("Escuro")).toBeChecked();
    expect(radio("Automático")).not.toBeChecked();
  });

  it("choosing «Claro» applies the light theme, and «Automático» forgets the choice", async () => {
    const user = userEvent.setup();
    render(<AppearanceCard />);
    await user.click(radio("Claro"));
    expect(theme()).toBe("light");
    await user.click(radio("Automático"));
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
    expect(radio("Automático")).toBeChecked();
  });

  it("shows the choice already made when the card opens", () => {
    localStorage.setItem(THEME_KEY, "dark");
    render(<AppearanceCard />);
    expect(radio("Escuro")).toBeChecked();
  });

  it("the arrows move the choice and the focus", async () => {
    const user = userEvent.setup();
    render(<AppearanceCard />);
    radio("Automático").focus();
    await user.keyboard("{ArrowRight}");
    expect(radio("Claro")).toHaveFocus();
    expect(theme()).toBe("light");
    await user.keyboard("{ArrowDown}");
    expect(radio("Escuro")).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(radio("Automático")).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(radio("Escuro")).toHaveFocus();
    expect(theme()).toBe("dark");
  });

  it("the selected one has a tick besides the colour", async () => {
    const user = userEvent.setup();
    render(<AppearanceCard />);
    await user.click(radio("Escuro"));
    expect(radio("Escuro").closest("label")!.querySelector("svg")).not.toBeNull();
    expect(radio("Claro").closest("label")!.querySelector("svg")).toBeNull();
  });

  it("F-342: «Tamanho do texto» has five choices, «Padrão» at first, and a choice applies at once and stays", async () => {
    const user = userEvent.setup();
    render(<AppearanceCard />);
    const group = screen.getByRole("radiogroup", { name: "Tamanho do texto" });
    expect(within(group).getAllByRole("radio").map((r) => r.closest("label")!.textContent)).toEqual(["Menor", "Padrão", "Maior", "Muito maior", "Máximo"]);
    expect(within(group).getByRole("radio", { name: "Padrão" })).toBeChecked();
    await user.click(within(group).getByRole("radio", { name: "Menor" }));
    expect(document.documentElement.style.getPropertyValue("--text-scale")).toBe("0.85");
    expect(localStorage.getItem(TEXT_SIZE_KEY)).toBe("menor");
    await user.click(within(group).getByRole("radio", { name: "Máximo" }));
    expect(document.documentElement.style.getPropertyValue("--text-scale")).toBe("1.31");
  });
});
