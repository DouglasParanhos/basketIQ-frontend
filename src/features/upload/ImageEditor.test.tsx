import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { NO_EDIT, type Edit } from "./edit";
import { ImageEditor } from "./ImageEditor";

/** The part, as the AddPage is: it keeps the edit and gives it back. */
function editor(initial: Edit = NO_EDIT) {
  const onChange = vi.fn();
  function Part({ value }: { value: Edit }) {
    const [edit, setEdit] = useState(value);
    return (
      <ImageEditor
        src="blob:parte-1"
        value={edit}
        onChange={(next) => {
          onChange(next);
          setEdit(next);
        }}
      />
    );
  }
  const view = render(<Part value={initial} />);
  const again = (next: Edit) => view.rerender(<ImageEditor src="blob:parte-1" value={next} onChange={onChange} />);
  return { onChange, again };
}

describe("image editor of one part (spec 013, A5)", () => {
  it("F-201: the zoom and the crop format come from the value, not from a state of its own", () => {
    const { again } = editor({ ...NO_EDIT, zoom: 2, aspect: 1 / 3 });
    expect(screen.getByRole("slider", { name: /zoom/i })).toHaveValue("2");
    expect(screen.getByRole("radio", { name: "Talão estreito" })).toBeChecked();
    again({ ...NO_EDIT, zoom: 1, aspect: null });
    expect(screen.getByRole("slider", { name: /zoom/i })).toHaveValue("1");
    expect(screen.getByRole("radio", { name: "Original" })).toBeChecked();
  });

  it("F-201: rotating reports the new rotation, keeping the rest of the value", async () => {
    const value = { ...NO_EDIT, zoom: 2 };
    const { onChange } = editor(value);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Rodar para a direita" }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ rotation: 90, zoom: 2 }));
    await user.click(screen.getByRole("button", { name: "Rodar para a esquerda" }));
    // The cropper measures its area on its own (not in jsdom): the rest of the value is kept.
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ rotation: 0, zoom: 2 }));
  });

  it("F-201: moving the zoom and choosing a format report them", async () => {
    const { onChange } = editor();
    fireEvent.change(screen.getByRole("slider", { name: /zoom/i }), { target: { value: "3" } });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ zoom: 3, aspect: null }));
    await userEvent.setup().click(screen.getByRole("radio", { name: "Talão largo" }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ zoom: 3, aspect: 1 / 2 }));
  });
});
