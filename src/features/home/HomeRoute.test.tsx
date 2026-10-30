import { screen } from "@testing-library/react";
import { useLocation } from "react-router";
import { describe, expect, it } from "vitest";
import { renderRoutes } from "../../test/render";
import { HomeRoute } from "./HomeRoute";

function Resumo() {
  return <p>resumo {useLocation().search}</p>;
}

function renderHome(initial: string) {
  return renderRoutes(
    [
      { path: "/", element: <HomeRoute /> },
      { path: "/compras/resumo", element: <Resumo /> },
    ],
    initial,
  ).router;
}

describe("provisional Início and old Resumo addresses (spec 009)", () => {
  it("F-95: / shows the title, «Adicionar talão» and «Ver resumo»", () => {
    renderHome("/");
    expect(screen.getByRole("heading", { level: 1, name: "Início" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Adicionar talão" })).toHaveAttribute("href", "/adicionar");
    expect(screen.getByRole("link", { name: "Ver resumo" })).toHaveAttribute("href", "/compras/resumo");
  });

  it("F-95: parameters that are not the Resumo's do not redirect", () => {
    renderHome("/?foo=1");
    expect(screen.getByRole("heading", { level: 1, name: "Início" })).toBeInTheDocument();
  });

  it("F-96: an old Resumo address goes to /compras/resumo with the same parameters", () => {
    const router = renderHome("/?de=2026-09-01&ate=2026-09-30&mercado=PINGO_DOCE");
    expect(screen.getByText("resumo ?de=2026-09-01&ate=2026-09-30&mercado=PINGO_DOCE")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/compras/resumo");
  });

  it.each(["periodo", "de", "ate", "mercado", "produto", "produto_nome"])(
    "F-96: the %s parameter triggers the redirect, replacing the history entry",
    (key) => {
      const router = renderHome(`/?${key}=x`);
      expect(screen.getByText(`resumo ?${key}=x`)).toBeInTheDocument();
      expect(router.state.historyAction).toBe("REPLACE");
    },
  );
});
