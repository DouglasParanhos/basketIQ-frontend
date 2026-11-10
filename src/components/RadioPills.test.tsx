import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { RadioPills } from "./RadioPills";

const OPTIONS = [
  { id: "a", label: "Todas" },
  { id: "b", label: "Confirmadas" },
  { id: "c", label: "Requer ação" },
];

function Harness() {
  const [value, setValue] = useState("a");
  return (
    <>
      <RadioPills label="Filtrar" options={OPTIONS} value={value} onChange={setValue} />
      <button type="button">Depois</button>
    </>
  );
}

describe("RadioPills (A-03)", () => {
  it("F-254: is a radio group named by its label, with the current option checked", () => {
    render(<Harness />);
    expect(screen.getByRole("radiogroup", { name: "Filtrar" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Todas" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Confirmadas" })).not.toBeChecked();
  });

  it("F-254: the arrows move the choice and the focus, and the group is one stop of Tab", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab();
    expect(screen.getByRole("radio", { name: "Todas" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Confirmadas" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Confirmadas" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Depois" })).toHaveFocus();
  });

  it("F-254: the checked option has a tick besides the colour; the others have none", () => {
    render(<Harness />);
    expect(screen.getByRole("radio", { name: "Todas" }).closest("label")!.querySelector("svg")).not.toBeNull();
    expect(screen.getByRole("radio", { name: "Confirmadas" }).closest("label")!.querySelector("svg")).toBeNull();
  });
});
