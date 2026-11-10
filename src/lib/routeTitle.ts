/** The part of the page title that names the screen (WCAG 2.4.2). The full title is «<part> · <app name>». */
const TITLES: Array<[RegExp, string]> = [
  [/^\/$/, "Início"],
  [/^\/compras$/, "Compras"],
  [/^\/compras\/resumo$/, "Resumo"],
  [/^\/compras\/[^/]+$/, "Talão"],
  [/^\/produtos$/, "Produtos"],
  [/^\/produtos\/[^/]+$/, "Produto"],
  [/^\/adicionar$/, "Adicionar talão"],
  [/^\/lista$/, "Lista"],
  [/^\/definicoes\/perfil$/, "Perfil"],
  [/^\/definicoes\/privacidade$/, "Privacidade"],
  [/^\/definicoes\/conta$/, "Conta"],
  [/^\/definicoes\/conta\/eliminar$/, "Eliminar conta"],
  [/^\/login$/, "Entrar"],
  [/^\/privacidade$/, "Política de privacidade"],
  [/^\/boas-vindas$/, "Boas-vindas"],
  [/^\/operador$/, "Operador"],
];

export function routeTitle(pathname: string): string {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return TITLES.find(([pattern]) => pattern.test(path))?.[1] ?? "Página não encontrada";
}
