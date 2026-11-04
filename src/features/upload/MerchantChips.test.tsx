import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { renderRoutes } from "../../test/render";
import { MerchantChips } from "./MerchantPicker";

function Chips({ start = "" }: { start?: string }) {
  const [merchant, setMerchant] = useState(start);
  return <MerchantChips value={merchant} onChange={setMerchant} />;
}
const open = (start = "") => renderRoutes([{ path: "/", element: <Chips start={start} /> }], "/");

describe("the store chips of Adicionar (approved design)", () => {
  it("«Detetar sozinho» is the green chip, and every store is its own pill, with its tile when it is not chosen", async () => {
    open();
    const group = await screen.findByRole("radiogroup", { name: "Supermercado (opcional)" });
    expect(await within(group).findByRole("radio", { name: "Lidl" })).not.toBeChecked();
    expect(within(group).getByRole("radio", { name: "Detetar sozinho" })).toBeChecked();
    const auto = within(group).getByText("Detetar sozinho");
    expect(auto.className).toContain("bg-brand");
    // Not chosen: white, with the border and the tile of the store.
    const lidl = within(group).getByText("Lidl", { selector: "span" });
    expect(lidl).toHaveStyle({ borderColor: "#0050AA" });
    expect(lidl.textContent).toBe("LLidl");
  });

  it("choosing a store paints it with its own colours and unchooses «Detetar sozinho»", async () => {
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole("radio", { name: "Lidl" }));
    expect(screen.getByRole("radio", { name: "Lidl" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Detetar sozinho" })).not.toBeChecked();
    const chosen = screen.getByText("Lidl", { selector: "span" });
    expect(chosen).toHaveStyle({ background: "#0050AA", color: "#FFCC00" });
    expect(screen.getByText("Detetar sozinho").className).not.toContain("bg-brand");
  });

  it("Auchan and Continente stay apart: Auchan is light with a red border, Continente solid red", async () => {
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole("radio", { name: "Auchan" }));
    const auchan = screen.getByText("Auchan", { selector: "span" });
    expect(auchan).toHaveStyle({ background: "#F4F3EF", borderColor: "#DF0613" });
    await user.click(screen.getByRole("radio", { name: "Continente" }));
    expect(screen.getByText("Continente", { selector: "span" })).toHaveStyle({ background: "#E30613" });
  });
});
