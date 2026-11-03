import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { me } from "../../test/fixtures";
import { renderRoutes } from "../../test/render";
import { API, server } from "../../test/server";
import { PrivacyPage } from "./PrivacyPage";

const routes = [
  { path: "/privacidade", element: <PrivacyPage /> },
  { path: "/", element: <p>início</p> },
  { path: "/boas-vindas", element: <p>boas-vindas</p> },
];

/** A person who still has to accept the policy (new, or the version changed), and the calls that matter. */
function pending(user: typeof me = { ...me, privacy_accepted_at: null, privacy_version: null }) {
  const calls = { consent: 0, logout: 0 };
  server.use(
    http.get(`${API}/v1/me`, () => HttpResponse.json(user)),
    http.post(`${API}/v1/me/privacy-consent`, () => {
      calls.consent += 1;
      return HttpResponse.json({ ...me });
    }),
    http.post(`${API}/v1/auth/logout`, () => {
      calls.logout += 1;
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return calls;
}

describe("Política de privacidade (approved design)", () => {
  it("has the title, the summary with two ticks and the five sections of the full policy, all closed", async () => {
    pending();
    renderRoutes(routes, "/privacidade");
    expect(await screen.findByRole("heading", { level: 1, name: "Política de privacidade" })).toBeInTheDocument();
    const summary = screen.getByRole("region", { name: "EM RESUMO" });
    expect(within(summary).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "Guardamos o seu nome, o e-mail e os dados dos seus talões.",
      "Usamos só para lhe mostrar as suas compras. Não vendemos nem partilhamos.",
    ]);
    const titles = ["Que dados guardamos", "Para que servem", "Onde são processados os talões", "Durante quanto tempo", "Os seus direitos"];
    for (const title of titles) expect(screen.getByRole("button", { name: title })).toHaveAttribute("aria-expanded", "false");
  });

  it("does not say the originals go «ao fim de 30 dias»: that is only true after the receipt is confirmed", async () => {
    pending();
    renderRoutes(routes, "/privacidade");
    await screen.findByRole("heading", { level: 1, name: "Política de privacidade" });
    expect(within(screen.getByRole("region", { name: "EM RESUMO" })).queryByText(/30 dias/)).toBeNull();
    await userEvent.setup().click(screen.getByRole("button", { name: "Durante quanto tempo" }));
    expect(screen.getByText(/30 dias depois de confirmar a compra/)).toBeVisible();
  });

  it("each section opens and closes from the keyboard, with Enter and with Space, and its text is read only when open", async () => {
    pending();
    const user = userEvent.setup();
    renderRoutes(routes, "/privacidade");
    const button = await screen.findByRole("button", { name: "Que dados guardamos" });
    expect(screen.queryByText(/identificador, nome e e-mail/)).not.toBeVisible();
    button.focus();
    await user.keyboard("{Enter}");
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("region", { name: "Que dados guardamos" })).toBeVisible();
    await user.keyboard(" ");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("region", { name: "Que dados guardamos" })).toBeNull();
    await user.tab();
    expect(screen.getByRole("button", { name: "Para que servem" })).toHaveFocus();
  });

  it("«Li a política e continuar» records the consent once and goes where the person was going", async () => {
    const calls = pending();
    const user = userEvent.setup();
    const { router } = renderRoutes(routes, "/privacidade");
    await user.click(await screen.findByRole("button", { name: "Li a política e continuar" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
    expect(calls).toEqual({ consent: 1, logout: 0 });
  });

  it("«Sair» ends the session and records nothing", async () => {
    const calls = pending();
    renderRoutes(routes, "/privacidade");
    await userEvent.setup().click(await screen.findByRole("button", { name: "Sair" }));
    await waitFor(() => expect(calls.logout).toBe(1));
    expect(calls.consent).toBe(0);
  });

  it("nothing is accepted before the click: no consent request when the page opens", async () => {
    const calls = pending();
    renderRoutes(routes, "/privacidade");
    await screen.findByRole("button", { name: "Li a política e continuar" });
    expect(calls).toEqual({ consent: 0, logout: 0 });
  });

  it("asks again when the policy changed for someone who had accepted the old one", async () => {
    pending({ ...me, privacy_version: "2026-01-01" });
    renderRoutes(routes, "/privacidade");
    expect(await screen.findByRole("button", { name: "Li a política e continuar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sair" })).toBeInTheDocument();
  });

  it("is only the policy, with no buttons to accept or leave, for someone who already accepted the current one", async () => {
    pending(me);
    renderRoutes(routes, "/privacidade");
    await screen.findByRole("heading", { level: 1, name: "Política de privacidade" });
    expect(screen.queryByRole("button", { name: "Li a política e continuar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Sair" })).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(5);
  });
});
