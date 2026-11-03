import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarketPill, MarketSegment, MarketTile } from "./MarketBadge";

describe("MarketBadge (approved design)", () => {
  it("the tile shows the initials on the colours of the store, with a radius of 30 % of its side", () => {
    const { container } = render(<MarketTile code="MERCADONA" size={40} fontSize={18} />);
    const tile = container.firstElementChild as HTMLElement;
    expect(tile).toHaveTextContent("M");
    expect(tile).toHaveStyle({ width: "40px", height: "40px", borderRadius: "12px", fontSize: "18px", color: "#006F42", background: "#F4F3EF", borderColor: "#006F42" });
  });

  it("two letters are set at 78 % of the font size", () => {
    const { container } = render(<MarketTile code="EL_CORTE_INGLES" size={44} fontSize={22} />);
    expect(container.firstElementChild).toHaveTextContent("EC");
    expect(container.firstElementChild).toHaveStyle({ fontSize: "17px" });
  });

  it("is hidden from the screen reader when the name is next to it, and an image with the full name when it is not", () => {
    const { container, rerender } = render(<MarketTile code="LIDL" size={24} fontSize={11} />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("img")).toBeNull();
    rerender(<MarketTile code="LIDL" size={24} fontSize={11} label="Lidl" />);
    expect(screen.getByRole("img", { name: "Lidl" })).toBeInTheDocument();
  });

  it("an unknown store is a neutral «?»", () => {
    const { container } = render(<MarketTile code="INTERMARCHE" size={40} fontSize={18} />);
    expect(container.firstElementChild).toHaveTextContent("?");
    expect(container.firstElementChild).toHaveStyle({ background: "#E6E2D9", color: "#5A564F" });
  });

  it("the pill says the name; chosen it is the store's colour (with «✓» on request), not chosen it carries the tile", () => {
    const { container, rerender } = render(<MarketPill code="LIDL" name="Lidl" checkmark />);
    expect(container.firstElementChild).toHaveTextContent("Lidl");
    expect(container.firstElementChild).toHaveStyle({ background: "#0050AA", color: "#FFCC00" });
    expect(container.querySelector("svg")).not.toBeNull();
    rerender(<MarketPill code="LIDL" name="Lidl" selected={false} />);
    expect(container.firstElementChild).toHaveTextContent("LLidl");
    expect(container.querySelector("svg")).toBeNull();
  });

  it("a segment of the stacked bar keeps the tile's colours: Auchan, light with a red border, next to Continente's solid red", () => {
    const { container } = render(
      <div>
        <MarketSegment code="CONTINENTE" share={40} />
        <MarketSegment code="AUCHAN" share={20} />
      </div>,
    );
    const [continente, auchan] = Array.from(container.querySelectorAll("span")) as HTMLElement[];
    expect(continente).toHaveStyle({ background: "#E30613", color: "#FFFFFF" });
    expect(auchan).toHaveStyle({ background: "#F4F3EF", color: "#DF0613", borderColor: "#DF0613" });
    expect(auchan).toHaveTextContent("AU");
    expect(auchan).toHaveStyle({ flex: "20 1 0" });
  });
});
