import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SegmentedTabs } from "./SegmentedTabs";

const TABS = [
  { id: "compras", label: "Compras" },
  { id: "resumo", label: "Resumo" },
  { id: "produtos", label: "Produtos" },
];

function setup(value = "resumo") {
  const onChange = vi.fn();
  render(<SegmentedTabs label="Talões" tabs={TABS} value={value} onChange={onChange} />);
  return { user: userEvent.setup(), onChange };
}

describe("segmented tabs (spec 009)", () => {
  it("F-92: exposes a named tablist, tabs with the selected state, and only the active tab in the tab order", () => {
    setup("resumo");
    expect(screen.getByRole("tablist", { name: "Talões" })).toBeInTheDocument();
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual(["Compras", "Resumo", "Produtos"]);
    expect(tabs.map((tab) => tab.getAttribute("aria-selected"))).toEqual(["false", "true", "false"]);
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([-1, 0, -1]);
    // The selected tab is also bold, so the state does not rely on the background colour alone.
    expect(tabs[1]!.className).toMatch(/aria-selected:font-bold/);
  });

  it("F-93: arrow keys, Home and End move the focus without activating", async () => {
    const { user, onChange } = setup("resumo");
    await user.tab();
    expect(screen.getByRole("tab", { name: "Resumo" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Produtos" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Compras" })).toHaveFocus(); // wraps around
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Produtos" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "Compras" })).toHaveFocus();
    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Produtos" })).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("F-93: Enter and Space activate the focused tab, and so does a click", async () => {
    const { user, onChange } = setup("resumo");
    await user.tab();
    await user.keyboard("{ArrowRight}{Enter}");
    expect(onChange).toHaveBeenLastCalledWith("produtos");
    await user.keyboard("{ArrowLeft}{ArrowLeft} ");
    expect(onChange).toHaveBeenLastCalledWith("compras");
    await user.click(screen.getByRole("tab", { name: "Resumo" }));
    expect(onChange).toHaveBeenLastCalledWith("resumo");
    expect(onChange).toHaveBeenCalledTimes(3);
  });
});
