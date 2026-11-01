import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MonthStepper } from "./MonthStepper";

describe("month stepper (spec 011, US6)", () => {
  it("F-188: the current month says «Este mês» with its days, and «Mês seguinte» is disabled", () => {
    render(<MonthStepper month="2026-10" current="2026-10" onChange={() => undefined} />);
    expect(screen.getByText("Este mês")).toBeInTheDocument();
    expect(screen.getByText("1 – 31 out. 2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mês seguinte" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Mês anterior" })).toBeEnabled();
  });

  it("F-188: a past month names the month and the year, and both buttons work", async () => {
    const onChange = vi.fn();
    render(<MonthStepper month="2026-09" current="2026-10" onChange={onChange} />);
    expect(screen.getByText("setembro de 2026")).toBeInTheDocument();
    expect(screen.getByText("1 – 30 set. 2026")).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Mês anterior" }));
    expect(onChange).toHaveBeenLastCalledWith("2026-08");
    await user.click(screen.getByRole("button", { name: "Mês seguinte" }));
    expect(onChange).toHaveBeenLastCalledWith("2026-10");
  });

  it("F-188: the label is announced when it changes", () => {
    render(<MonthStepper month="2026-10" current="2026-10" onChange={() => undefined} />);
    expect(screen.getByText("Este mês").closest("[aria-live]")).toHaveAttribute("aria-live", "polite");
  });
});
