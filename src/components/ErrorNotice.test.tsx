import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiError, NETWORK_MESSAGE } from "../api/client";
import { ErrorNotice } from "./ui";

describe("ErrorNotice (T-17, T-18)", () => {
  it("F-256: a failure to reach the API has one text, with no «servidor», and «Tentar de novo» tries again", async () => {
    const retry = vi.fn();
    render(<ErrorNotice what="carregar as compras" error={new ApiError(0, undefined)} onRetry={retry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar as compras.");
    expect(screen.getByRole("alert")).toHaveTextContent(NETWORK_MESSAGE);
    expect(NETWORK_MESSAGE).not.toMatch(/servidor/i);
    await userEvent.setup().click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("F-256: a server fault never shows the backend's text; an error of the request shows its reason", () => {
    const { rerender } = render(<ErrorNotice what="guardar" error={new ApiError(500, { message: "Traceback: psycopg2.OperationalError" })} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Algo falhou do nosso lado. Tente de novo daqui a pouco.");
    expect(screen.getByRole("alert")).not.toHaveTextContent(/psycopg2/);
    rerender(<ErrorNotice what="guardar" error={new ApiError(422, { message: "O total tem de ser positivo." })} />);
    expect(screen.getByRole("alert")).toHaveTextContent("O total tem de ser positivo.");
    expect(screen.queryByRole("button", { name: "Tentar de novo" })).toBeNull();
  });
});
