import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { FullScreen } from "./FullScreen";

describe("full screens start on their title (A-02)", () => {
  it("F-252: the title takes the focus when the screen does not choose another target", () => {
    render(<FullScreen start={<a href="/">Voltar</a>} title="Eliminar conta">corpo</FullScreen>);
    expect(screen.getByRole("heading", { level: 1, name: "Eliminar conta" })).toHaveFocus();
  });

  it("F-252: a screen that passes its own title reference keeps control of the focus", () => {
    const ref = createRef<HTMLHeadingElement>();
    render(<FullScreen start={<a href="/">Voltar</a>} title="Editar perfil" titleRef={ref}>corpo</FullScreen>);
    expect(ref.current).toBe(screen.getByRole("heading", { level: 1, name: "Editar perfil" }));
    expect(ref.current).not.toHaveFocus();
  });
});
