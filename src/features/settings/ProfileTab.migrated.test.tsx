import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { routes } from "../../App";
import { emptyProfile, migratedProfile } from "../../test/fixtures";
import { renderRoutes } from "../../test/render";
import { API, server, serveProfile } from "../../test/server";

/** PATCH /v1/me/profile: collects the bodies and answers with the profile they produce, over the migrated one. */
function serveSave() {
  const bodies: Record<string, unknown>[] = [];
  server.use(
    http.patch(`${API}/v1/me/profile`, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      bodies.push(body);
      return HttpResponse.json({ ...migratedProfile, ...body });
    }),
  );
  return bodies;
}

async function open(url: string, profile = migratedProfile) {
  serveProfile(profile);
  const view = { ...renderRoutes(routes, url), user: userEvent.setup() };
  const editing = url.includes("editar");
  await screen.findByRole("heading", { level: editing ? 1 : 2, name: editing ? "Editar perfil" : "Perfil" });
  return view;
}
const press = (user: ReturnType<typeof userEvent.setup>, name: string | RegExp) => user.click(screen.getByRole("button", { name }));
const goalField = () => screen.getByRole("textbox", { name: /Meta pessoal do mês/ });

describe("accounts from before the onboarding (spec 014, US5)", () => {
  it("F-193: the Perfil of a finished and empty account has the four blocks to define, and no onboarding", async () => {
    const { router } = await open("/definicoes/perfil");
    expect(router.state.location.pathname).toBe("/definicoes/perfil");
    expect(screen.getAllByText("Ainda não definiu.")).toHaveLength(4);
    expect(screen.getAllByRole("button", { name: /^Definir / })).toHaveLength(4);
  });

  it("F-193: ?editar=meta opens the editing on the goal", async () => {
    await open("/definicoes/perfil?editar=meta");
    expect(goalField()).toHaveFocus();
    expect(goalField()).toHaveValue("");
  });

  it("F-193: defining only the goal sends exactly the goal, never the onboarding flag, nulls or empty lists", async () => {
    const bodies = serveSave();
    const { user } = await open("/definicoes/perfil?editar=meta");
    await user.type(goalField(), "350");
    await press(user, "Guardar alterações");
    expect(await screen.findByText("Perfil guardado.")).toBeInTheDocument();
    expect(bodies).toEqual([{ monthly_goal_cents: 35000 }]);
    expect(screen.getByText("350,00 €")).toBeInTheDocument();
  });

  it("F-193: people, a merchant, a goal and the monthly goal go in one request", async () => {
    const bodies = serveSave();
    const { user } = await open("/definicoes/perfil");
    await press(user, "Definir pessoas na casa");
    await press(user, "Mais uma pessoa");
    await press(user, "Mais uma pessoa");
    await user.click(await screen.findByRole("checkbox", { name: "Lidl" }));
    await user.click(screen.getByRole("checkbox", { name: /Organizar as minhas finanças/ }));
    await user.type(goalField(), "300");
    await press(user, "Guardar alterações");
    expect(await screen.findByText("Perfil guardado.")).toBeInTheDocument();
    expect(bodies).toEqual([{ household_size: 2, merchants: ["LIDL"], goals: ["finances"], monthly_goal_cents: 30000 }]);
  });

  it("F-193: an account that has not finished the onboarding is sent to /boas-vindas, not to the Perfil", async () => {
    serveProfile(emptyProfile());
    const { router } = renderRoutes(routes, "/definicoes/perfil");
    await waitFor(() => expect(router.state.location.pathname).toBe("/boas-vindas"));
  });

  it("F-193: saving the goal makes the Início read its month again", async () => {
    serveSave();
    const { user, client } = await open("/definicoes/perfil?editar=meta");
    const invalidate = vi.spyOn(client, "invalidateQueries");
    await user.type(goalField(), "350");
    await press(user, "Guardar alterações");
    await screen.findByText("Perfil guardado.");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["overview"] });
  });
});
