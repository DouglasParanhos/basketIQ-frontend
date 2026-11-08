import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnnounceProvider, useAnnounce } from "./Announce";

function Say({ message, tone }: { message: string; tone?: "status" | "alert" }) {
  const announce = useAnnounce();
  return <button onClick={() => announce(message, tone)}>dizer</button>;
}

const wait = (ms: number) => act(async () => void (await new Promise((resolve) => setTimeout(resolve, ms))));

describe("live regions (infra for A-06, A-08, A-17, A-18, A-20, A-32)", () => {
  it("F-250: both regions exist from the first render, empty", () => {
    render(<AnnounceProvider><p>x</p></AnnounceProvider>);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
  });

  it("F-250: a status message goes to the polite region and an alert to the assertive one", async () => {
    render(<AnnounceProvider><Say message="Compra confirmada" /><Say message="Falhou o envio" tone="alert" /></AnnounceProvider>);
    const [status, alert] = screen.getAllByRole("button") as [HTMLElement, HTMLElement];
    act(() => status.click());
    await wait(120);
    expect(screen.getByRole("status")).toHaveTextContent("Compra confirmada");
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
    act(() => alert.click());
    await wait(120);
    expect(screen.getByRole("alert")).toHaveTextContent("Falhou o envio");
  });

  it("F-251: the same message said twice is emptied first, so a reader says it twice", async () => {
    render(<AnnounceProvider><Say message="2 compras" /></AnnounceProvider>);
    act(() => screen.getByRole("button").click());
    await wait(120);
    expect(screen.getByRole("status")).toHaveTextContent("2 compras");
    act(() => screen.getByRole("button").click());
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    await wait(120);
    expect(screen.getByRole("status")).toHaveTextContent("2 compras");
  });

  it("F-251: without the provider, saying something does nothing and does not fail", () => {
    render(<Say message="x" />);
    expect(() => screen.getByRole("button").click()).not.toThrow();
  });
});
