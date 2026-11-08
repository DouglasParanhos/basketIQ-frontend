import { describe, expect, it } from "vitest";
import { routeTitle } from "./routeTitle";

describe("route titles (WCAG 2.4.2)", () => {
  it.each([
    ["/", "Início"],
    ["/compras", "Compras"],
    ["/compras/resumo", "Resumo"],
    ["/compras/8f2a", "Talão"],
    ["/produtos", "Produtos"],
    ["/produtos/12", "Produto"],
    ["/adicionar", "Adicionar talão"],
    ["/lista", "Lista"],
    ["/definicoes/perfil", "Perfil"],
    ["/definicoes/privacidade", "Privacidade"],
    ["/definicoes/conta", "Conta"],
    ["/definicoes/conta/eliminar", "Eliminar conta"],
    ["/login", "Entrar"],
    ["/privacidade", "Política de privacidade"],
    ["/boas-vindas", "Boas-vindas"],
    ["/operador", "Operador"],
    ["/compras/", "Compras"],
  ])("F-246: %s is «%s»", (path, title) => {
    expect(routeTitle(path)).toBe(title);
  });

  it("F-246: an unknown path says so, and every screen has a different title", () => {
    expect(routeTitle("/inexistente")).toBe("Página não encontrada");
    const titles = ["/", "/compras", "/compras/resumo", "/produtos", "/adicionar", "/definicoes/perfil", "/definicoes/conta"].map(routeTitle);
    expect(new Set(titles).size).toBe(titles.length);
  });
});
