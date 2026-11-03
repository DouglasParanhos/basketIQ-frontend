import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderRoutes } from "../../test/render";
import { ReceiptPage } from "./ReceiptPage";

const open = () => renderRoutes([{ path: "/compras/:id", element: <ReceiptPage /> }], "/compras/r1");

describe("Rever talão (approved design)", () => {
  it("the warning to review is the gold of the chips, with the warning icon, and says it in words", async () => {
    open();
    const notice = (await screen.findByText("Reveja antes de confirmar")).closest("[role=status]") as HTMLElement;
    expect(notice.className).toContain("bg-warn-soft");
    expect(notice.className).toContain("text-warn-ink");
    expect(notice.querySelector("svg[aria-hidden=true]")).not.toBeNull();
  });

  it("the actions are the 56 px pills, with the sentence that says what confirming does", async () => {
    open();
    await screen.findByText("Reveja antes de confirmar");
    expect(screen.getByText("Ao confirmar, os valores entram nos seus gastos.")).toBeInTheDocument();
    for (const name of ["Guardar", "Confirmar"]) {
      const button = screen.getByRole("button", { name: new RegExp(name) });
      expect(button.className).toContain("min-h-14");
      expect(button.className).toContain("rounded-[28px]");
    }
  });

  it("the title of the purchase is set in Fraunces", async () => {
    open();
    await screen.findByText("Reveja antes de confirmar");
    expect(screen.getByRole("heading", { level: 1 }).className).toContain("font-display");
  });
});
