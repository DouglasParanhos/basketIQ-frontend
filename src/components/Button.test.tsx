import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./ui";

describe("Button (A-05)", () => {
  it("F-255: a busy button is aria-disabled, not disabled, so it keeps the focus; its click does nothing", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button busy onClick={onClick}>
        Guardar
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Guardar" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeEnabled();
    await user.tab();
    expect(button).toHaveFocus();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("F-255: a busy submit button does not submit twice, not even with Enter in a field", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <input aria-label="Nome" />
        <Button type="submit" busy>
          Guardar
        </Button>
      </form>,
    );
    await user.type(screen.getByLabelText("Nome"), "x{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("F-255: a button that is not busy clicks as before, and an explicit disabled still disables it", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Guardar</Button>);
    expect(screen.getByRole("button")).not.toHaveAttribute("aria-disabled");
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(
      <Button disabled onClick={onClick}>
        Guardar
      </Button>,
    );
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
