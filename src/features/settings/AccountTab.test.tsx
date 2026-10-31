import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { routes } from "../../App";
import { formatDate } from "../../lib/format";
import { adminMe, me } from "../../test/fixtures";
import { renderRoutes } from "../../test/render";
import { API, errorBody, server } from "../../test/server";

async function openAccount(url = "/definicoes/conta") {
  const view = { ...renderRoutes(routes, url), user: userEvent.setup() };
  await screen.findByRole("heading", { level: 1, name: url.endsWith("eliminar") ? "Eliminar conta" : "Definições" });
  return view;
}

describe("account tab (spec 014, US4)", () => {
  it("F-192: shows how the person signed in, when the account was created, and «Terminar sessão»", async () => {
    await openAccount();
    expect(await screen.findByText("Entrou com Google · maria@example.test")).toBeInTheDocument();
    expect(screen.getByText(`Conta criada a ${formatDate(me.created_at)}.`)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Terminar sessão" })).toBeInTheDocument();
  });

  it("F-192: «Terminar sessão» ends the session once", async () => {
    let logouts = 0;
    server.use(http.post(`${API}/v1/auth/logout`, () => { logouts += 1; return new HttpResponse(null, { status: 204 }); }));
    const { user } = await openAccount();
    await user.click(await screen.findByRole("button", { name: "Terminar sessão" }));
    await waitFor(() => expect(logouts).toBe(1));
  });

  it("F-192: the operator panel is offered to operators only", async () => {
    const first = await openAccount();
    await screen.findByText("Entrou com Google · maria@example.test");
    expect(screen.queryByRole("link", { name: "Abrir painel do operador" })).not.toBeInTheDocument();
    first.unmount();
    server.use(http.get(`${API}/v1/me`, () => HttpResponse.json(adminMe)));
    await openAccount();
    expect(await screen.findByRole("link", { name: "Abrir painel do operador" })).toHaveAttribute("href", "/operador");
  });

  it("F-192: «Eliminar conta…» opens the screen of its own and the browser's Back returns to the Conta tab", async () => {
    const { user, router } = await openAccount();
    await user.click(await screen.findByRole("link", { name: "Eliminar conta…" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Eliminar conta" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/definicoes/conta/eliminar");
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    await act(() => router.navigate(-1));
    expect(await screen.findByRole("heading", { level: 1, name: "Definições" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/definicoes/conta");
  });
});

describe("delete account screen (spec 014, US4)", () => {
  it("F-192: explains what disappears", async () => {
    await openAccount("/definicoes/conta/eliminar");
    expect(screen.getByText("Isto não pode ser desfeito")).toBeInTheDocument();
    for (const item of [
      "Todas as compras e talões lidos",
      "Os ficheiros originais guardados",
      "O seu perfil, a meta e as preferências",
      "O acesso com esta conta Google",
    ]) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
  });

  it("F-23, F-192: the final button is off until the person ticks the box, and nothing is deleted before", async () => {
    let deletes = 0;
    server.use(http.delete(`${API}/v1/me`, () => { deletes += 1; return HttpResponse.json({ receipts_deleted: 1, objects_deleted: 1 }); }));
    const { user } = await openAccount("/definicoes/conta/eliminar");
    const confirm = screen.getByRole("button", { name: "Eliminar a minha conta" });
    expect(confirm).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: "Compreendo que os meus dados serão eliminados e que não é possível recuperá-los." }));
    expect(confirm).toBeEnabled();
    expect(deletes).toBe(0);
  });

  it("F-23, F-192: confirming sends one DELETE /v1/me", async () => {
    let deletes = 0;
    server.use(http.delete(`${API}/v1/me`, () => { deletes += 1; return HttpResponse.json({ receipts_deleted: 1, objects_deleted: 1 }); }));
    const { user } = await openAccount("/definicoes/conta/eliminar");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Eliminar a minha conta" }));
    await waitFor(() => expect(deletes).toBe(1));
  });

  it("F-192: «Cancelar» goes back to the Conta tab without deleting anything", async () => {
    let deletes = 0;
    server.use(http.delete(`${API}/v1/me`, () => { deletes += 1; return HttpResponse.json({}); }));
    const { user, router } = await openAccount("/definicoes/conta/eliminar");
    await user.click(screen.getByRole("link", { name: "Cancelar" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Definições" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/definicoes/conta");
    expect(deletes).toBe(0);
  });

  it("F-192: a server error is shown, the screen stays and nothing redirects", async () => {
    server.use(http.delete(`${API}/v1/me`, () => HttpResponse.json(errorBody("internal_error", "Não foi possível eliminar a conta."), { status: 500 })));
    const { user, router } = await openAccount("/definicoes/conta/eliminar");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Eliminar a minha conta" }));
    expect(await screen.findByText("Não foi possível eliminar a conta.")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/definicoes/conta/eliminar");
  });
});
