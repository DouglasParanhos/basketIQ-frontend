import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { useConfirmFocus } from "./useConfirmFocus";

function Example({ hideOpener = false }: { hideOpener?: boolean }) {
  const [open, setOpen] = useState(false);
  const title = useConfirmFocus<HTMLParagraphElement>(open);
  return (
    <>
      {!(hideOpener && open) && <button onClick={() => setOpen(true)}>Eliminar</button>}
      {open && (
        <div>
          <p ref={title} tabIndex={-1}>
            Eliminar esta compra?
          </p>
          <button onClick={() => setOpen(false)}>Cancelar</button>
        </div>
      )}
    </>
  );
}

describe("useConfirmFocus (A-14)", () => {
  it("F-258: opening the question puts the focus on its title, closing it gives the focus back to the button that opened it", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(screen.getByText("Eliminar esta compra?")).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByRole("button", { name: "Eliminar" })).toHaveFocus();
  });

  it("F-258: when the button that opened it is gone, closing does not fail", async () => {
    const user = userEvent.setup();
    render(<Example hideOpener />);
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(screen.getByText("Eliminar esta compra?")).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByRole("button", { name: "Eliminar" })).toBeInTheDocument();
  });
});
