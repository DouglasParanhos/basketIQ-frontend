import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Quad } from "../capture/homography";
import { NO_EDIT, type Edit } from "./edit";
import { QuadEditor } from "./QuadEditor";

const FOUND: Quad = [
  [0.2, 0.1],
  [0.8, 0.1],
  [0.8, 0.9],
  [0.2, 0.9],
];

function editor(value: Edit = NO_EDIT, found: Quad | null = FOUND) {
  const onChange = vi.fn();
  const view = render(<QuadEditor src="blob:parte-1" value={value} found={found} onChange={onChange} />);
  return { onChange, user: userEvent.setup(), again: (next: Edit) => view.rerender(<QuadEditor src="blob:parte-1" value={next} found={found} onChange={onChange} />) };
}

const corner = (name: string) => screen.getByRole("button", { name: `Canto ${name}` });
/** The corner the last change set, as [x, y] rounded to 3 places. */
const lastCorner = (onChange: ReturnType<typeof vi.fn>, i: number) => {
  const { corners } = onChange.mock.lastCall![0] as Edit;
  return corners![i]!.map((v) => Math.round(v * 1000) / 1000);
};

describe("QuadEditor (spec 017)", () => {
  it("F-229: four corners where the receipt was found, the rotations and «Repor cantos», no zoom nor format", () => {
    editor();
    for (const name of ["superior esquerdo", "superior direito", "inferior direito", "inferior esquerdo"]) expect(corner(name)).toBeInTheDocument();
    expect(corner("superior esquerdo")).toHaveStyle({ left: "20%", top: "10%" });
    expect(screen.getByRole("button", { name: "Rodar para a esquerda" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rodar para a direita" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Repor cantos" })).toBeDisabled();
    expect(screen.getByText("Arraste os cantos até às pontas do talão.")).toBeInTheDocument();
    expect(screen.queryByText(/zoom/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/talão estreito/i)).not.toBeInTheDocument();
  });

  it("F-229: without a receipt found, the corners start at the corners of the photo", () => {
    editor(NO_EDIT, null);
    expect(corner("inferior direito")).toHaveStyle({ left: "100%", top: "100%" });
  });

  it("F-229: the arrows move the corner 1 %, with Shift 5 %, and the others stay", async () => {
    const { onChange, user, again } = editor();
    corner("superior esquerdo").focus();
    await user.keyboard("{ArrowRight}");
    expect(lastCorner(onChange, 0)).toEqual([0.21, 0.1]);
    expect(lastCorner(onChange, 2)).toEqual([0.8, 0.9]);
    again(onChange.mock.lastCall![0] as Edit);
    await user.keyboard("{Shift>}{ArrowDown}{/Shift}");
    expect(lastCorner(onChange, 0)).toEqual([0.21, 0.15]);
  });

  it("F-229: a corner never leaves the photo", async () => {
    const { onChange, user } = editor(NO_EDIT, null);
    corner("superior esquerdo").focus();
    await user.keyboard("{ArrowLeft}");
    expect(lastCorner(onChange, 0)).toEqual([0, 0]);
  });

  it("F-229: «Repor cantos» goes back to the corners found", async () => {
    const moved: Edit = { rotation: 90, corners: FOUND.map(([x, y]) => [x + 0.05, y] as const) as unknown as Quad };
    const { onChange, user } = editor(moved);
    await user.click(screen.getByRole("button", { name: "Repor cantos" }));
    expect(onChange).toHaveBeenLastCalledWith({ rotation: 90, corners: null });
  });

  it("F-229: rotating keeps the corners on the receipt and names them as they are seen", async () => {
    const { onChange, user } = editor({ rotation: 90, corners: null });
    // Turned right, the receipt's bottom-left corner is seen at the top left.
    expect(corner("superior esquerdo")).toHaveStyle({ left: "10%", top: "20%" });
    corner("superior esquerdo").focus();
    await user.keyboard("{ArrowRight}"); // to the right as seen: up the photo before it turned
    expect(lastCorner(onChange, 3)).toEqual([0.2, 0.89]);
    await user.click(screen.getByRole("button", { name: "Rodar para a direita" }));
    expect(onChange).toHaveBeenLastCalledWith({ rotation: 180, corners: null });
  });
});
