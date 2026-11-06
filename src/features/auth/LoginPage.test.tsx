import { readFileSync } from "node:fs";
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderRoutes } from "../../test/render";
import { anonymous } from "../../test/server";
import { LoginPage } from "./LoginPage";

const renderLogin = async (search = "") => {
  anonymous();
  renderRoutes([{ path: "/login", element: <LoginPage /> }], `/login${search}`);
  await screen.findByRole("link", { name: /entrar com google/i });
};

const hiddenFromScreenReaders = (el: HTMLElement) => el.closest('[aria-hidden="true"]') !== null;

describe("login: the ticket of the approved design", () => {
  it("without passkey support it offers Google only: no e-mail button, no field and no «ou» separator", async () => {
    await renderLogin();
    expect(screen.getByRole("link", { name: "Entrar com Google" })).toHaveAttribute("href", "/v1/auth/login");
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByText(/entrar com e-mail|enviar link/i)).toBeNull();
    expect(screen.queryByText("ou")).toBeNull();
  });

  it("reads the name as the title and the slogan; the slot, the lines and the total are decoration", async () => {
    await renderLogin();
    const title = screen.getByRole("heading", { level: 1, name: "Super Mercado" });
    expect(hiddenFromScreenReaders(title)).toBe(false);
    expect(hiddenFromScreenReaders(screen.getByText("CADA TALÃO CONTA"))).toBe(false);
    for (const text of ["1x FAÇA COMPRAS", "2x FOTOGRAFE OU PARTILHE", "3x PERCEBA OS GASTOS", "4x ACOMPANHE", "TOTAL", "CONTROLO"]) {
      expect(hiddenFromScreenReaders(screen.getByText(text)), text).toBe(true);
    }
  });

  it("the receipts scrolling behind are two decorative columns, hidden from the screen reader and not text of the page", async () => {
    await renderLogin();
    const columns = Array.from(document.querySelectorAll<HTMLElement>("[data-lines]"));
    expect(columns).toHaveLength(2);
    for (const column of columns) expect(hiddenFromScreenReaders(column)).toBe(true);
    expect(columns[0]!.dataset.lines).toContain("LEITE MEIO GORDO 0,79");
    expect(columns[1]!.dataset.lines).toContain("SUMO LARANJA 1L 1,69");
    expect(screen.queryByText("LEITE MEIO GORDO 0,79")).toBeNull();
  });

  it("links the legal line to the policy", async () => {
    await renderLogin();
    expect(screen.getByText(/Usamos apenas o seu nome e e-mail\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Política de privacidade" })).toHaveAttribute("href", "/privacidade");
  });

  it("shows no strip when there is no error", async () => {
    await renderLogin();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it.each([
    ["cancelled", "O início de sessão foi cancelado. Pode tentar novamente quando quiser."],
    ["session_expired", "A sua sessão terminou. Entre novamente para continuar."],
    ["login_failed", "Não foi possível confirmar a sua conta Google. Tente novamente."],
    ["provider_unavailable", "O serviço da Google não respondeu. Tente novamente dentro de momentos."],
    ["provider_error", "A Google devolveu um erro. Tente novamente."],
    ["invalid_request", "O pedido de início de sessão expirou. Tente novamente."],
    ["something_new", "Não foi possível confirmar a sua conta Google. Tente novamente."],
  ])("the error «%s» says what the strip says", async (code, text) => {
    await renderLogin(`?error=${code}`);
    expect(within(screen.getByRole("status")).getByText(text)).toBeInTheDocument();
  });
});

describe("login: motion", () => {
  // The tests cannot evaluate the media query (css: false); the e2e checks the computed style. Here: the rule exists and names each of them.
  const rule = /@media \(prefers-reduced-motion: reduce\) \{\s*(\.ticket-[^{]*)\{([^}]*)\}/.exec(readFileSync("src/styles.css", "utf8"));

  it("with prefers-reduced-motion the ticket, the marker and the scrolling receipts have no animation at all", () => {
    expect(rule).not.toBeNull();
    for (const cls of ["ticket-reveal", "ticket-shake", "ticket-up", "ticket-down", "ticket-marker"]) expect(rule![1], cls).toContain(`.${cls}`);
    expect(rule![2]).toContain("animation: none");
  });
});
