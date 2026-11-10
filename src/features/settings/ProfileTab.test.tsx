import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { routes } from "../../App";
import { emptyProfile, me, profile } from "../../test/fixtures";
import { renderRoutes } from "../../test/render";
import { API, errorBody, server, serveProfile } from "../../test/server";

type Saved = typeof profile;
const saved: Saved = { ...profile, household_size: 2, merchants: ["LIDL"], goals: ["finances"], monthly_goal_cents: 30000 };

/** PATCH /v1/me/profile: collects the bodies and answers with the profile they produce. */
function serveSave(current: Saved, answer?: () => Response) {
  const bodies: Record<string, unknown>[] = [];
  server.use(
    http.patch(`${API}/v1/me/profile`, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      bodies.push(body);
      return answer ? answer() : HttpResponse.json({ ...current, ...body });
    }),
  );
  return bodies;
}

async function openProfile(current: Saved = saved, url = "/definicoes/perfil") {
  serveProfile(current);
  const view = { ...renderRoutes(routes, url), user: userEvent.setup() };
  const editing = url.includes("editar");
  await screen.findByRole("heading", { level: editing ? 1 : 2, name: editing ? "Editar perfil" : "Perfil" });
  return view;
}

const press = (user: ReturnType<typeof userEvent.setup>, name: string | RegExp) => user.click(screen.getByRole("button", { name }));
const goalField = () => screen.getByRole("textbox", { name: /Meta pessoal do mês/ });
const counter = () => screen.getByText(/^(Sem alterações|\d+ (alteração|alterações) por guardar)$/);

describe("profile tab (spec 014, US2)", () => {
  it("F-190: reads the four blocks, each with «Editar»", async () => {
    await openProfile();
    for (const title of ["Pessoas na casa", "Onde faz compras", "Meta pessoal do mês", "Objetivos"]) {
      expect(screen.getByRole("heading", { level: 3, name: title })).toBeInTheDocument();
    }
    expect(screen.getByText("2 pessoas")).toBeInTheDocument();
    expect(screen.getByText("Lidl")).toBeInTheDocument();
    expect(screen.getByText("300,00 €")).toBeInTheDocument();
    expect(screen.getByText("Um objetivo seu, não um limite.")).toBeInTheDocument();
    expect(screen.getByText("Organizar as minhas finanças")).toBeInTheDocument();
    for (const name of ["Editar pessoas na casa", "Editar supermercados", "Editar meta pessoal", "Editar objetivos"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });

  it("F-190: an empty profile says it is not defined and offers «Definir»", async () => {
    await openProfile(emptyProfile({ onboarding_completed_at: "2026-10-31T00:00:00Z" }));
    expect(screen.getAllByText("Ainda não definiu.")).toHaveLength(4);
    for (const name of ["Definir pessoas na casa", "Definir supermercados", "Definir meta pessoal", "Definir objetivos"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(screen.queryByText(/\d pessoas/)).not.toBeInTheDocument();
  });

  it("F-190: the merchants are read by name even when the list of merchants does not load", async () => {
    server.use(http.get(`${API}/v1/merchants`, () => HttpResponse.json(errorBody("internal_error", "x"), { status: 500 })));
    await openProfile({ ...saved, merchants: ["LIDL", "PINGO_DOCE"] });
    expect(await screen.findByText("Lidl")).toBeInTheDocument();
    expect(screen.getByText("Pingo Doce")).toBeInTheDocument();
  });

  it("F-190: «Editar» opens «Editar perfil» on the chosen block, with nothing to save yet", async () => {
    const { user } = await openProfile();
    await press(user, "Editar pessoas na casa");
    expect(await screen.findByRole("heading", { level: 1, name: "Editar perfil" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Pessoas na casa" })).toHaveFocus();
    expect(counter()).toHaveTextContent("Sem alterações");
    expect(screen.getByRole("button", { name: "Guardar alterações" })).toBeDisabled();
  });

  it("F-190: «Editar» on the goal puts the focus on the goal field", async () => {
    const { user } = await openProfile();
    await press(user, "Editar meta pessoal");
    expect(goalField()).toHaveFocus();
    expect(goalField()).toHaveValue("300,00");
  });

  it("F-190: counts the changes: 1, then 3", async () => {
    const { user } = await openProfile();
    await press(user, "Editar pessoas na casa");
    await press(user, "Mais uma pessoa");
    expect(counter()).toHaveTextContent("1 alteração por guardar");
    await user.click(await screen.findByRole("checkbox", { name: "Aldi" }));
    await user.clear(goalField());
    await user.type(goalField(), "450");
    expect(counter()).toHaveTextContent("3 alterações por guardar");
    expect(screen.getByRole("button", { name: "Guardar alterações" })).toBeEnabled();
  });

  it("F-190: «Cancelar» without changes goes back at once; with changes it asks first", async () => {
    const { user } = await openProfile();
    await press(user, "Editar pessoas na casa");
    await press(user, "Cancelar");
    expect(await screen.findByRole("heading", { level: 2, name: "Perfil" })).toBeInTheDocument();

    await press(user, "Editar pessoas na casa");
    await press(user, "Mais uma pessoa");
    await user.click(await screen.findByRole("checkbox", { name: "Aldi" }));
    await user.clear(goalField());
    await user.type(goalField(), "450");
    await press(user, "Cancelar");
    expect(screen.getByText("Descartar as 3 alterações?")).toBeInTheDocument();
    await press(user, "Continuar a editar");
    expect(screen.queryByText("Descartar as 3 alterações?")).not.toBeInTheDocument();
    expect(counter()).toHaveTextContent("3 alterações por guardar");
    await press(user, "Cancelar");
    await press(user, "Descartar");
    expect(await screen.findByRole("heading", { level: 2, name: "Perfil" })).toBeInTheDocument();
    expect(screen.getByText("2 pessoas")).toBeInTheDocument();
    expect(screen.getByText("300,00 €")).toBeInTheDocument();
  });

  it("F-190: saving sends one PATCH with only what changed, says «Perfil guardado.» and refreshes the Início", async () => {
    const bodies = serveSave(saved);
    const { user, client } = await openProfile();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    await press(user, "Editar meta pessoal");
    await user.clear(goalField());
    await user.type(goalField(), "450,50");
    await press(user, "Guardar alterações");
    expect(await screen.findByText("Perfil guardado.")).toBeInTheDocument();
    expect(bodies).toEqual([{ monthly_goal_cents: 45050 }]);
    expect(screen.getByText("450,50 €")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Perfil" })).toHaveFocus();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["overview"] });
  });

  it("F-190: clearing the goal sends null", async () => {
    const bodies = serveSave(saved);
    const { user } = await openProfile();
    await press(user, "Editar meta pessoal");
    await user.clear(goalField());
    await press(user, "Guardar alterações");
    expect(await screen.findByText("Perfil guardado.")).toBeInTheDocument();
    expect(bodies).toEqual([{ monthly_goal_cents: null }]);
    expect(screen.getByRole("button", { name: "Definir meta pessoal" })).toBeInTheDocument();
  });

  it("F-190: a failed save keeps the editing with the changes, and again sends the same body", async () => {
    let fail = true;
    const bodies = serveSave(saved, () => (fail ? HttpResponse.json(errorBody("internal_error", "x"), { status: 500 }) : HttpResponse.json({ ...saved, household_size: 3 })));
    const { user } = await openProfile();
    await press(user, "Editar pessoas na casa");
    await press(user, "Mais uma pessoa");
    await press(user, "Guardar alterações");
    expect(await screen.findByText("Não foi possível guardar. Tente de novo.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Editar perfil" })).toBeInTheDocument();
    expect(counter()).toHaveTextContent("1 alteração por guardar");
    fail = false;
    await press(user, "Guardar alterações");
    expect(await screen.findByText("Perfil guardado.")).toBeInTheDocument();
    expect(bodies).toEqual([{ household_size: 3 }, { household_size: 3 }]);
  });

  it("F-190: a network failure behaves the same way", async () => {
    server.use(http.patch(`${API}/v1/me/profile`, () => HttpResponse.error()));
    const { user } = await openProfile();
    await press(user, "Editar pessoas na casa");
    await press(user, "Mais uma pessoa");
    await press(user, "Guardar alterações");
    expect(await screen.findByText("Não foi possível guardar. Tente de novo.")).toBeInTheDocument();
    expect(counter()).toHaveTextContent("1 alteração por guardar");
  });

  it("F-190: a goal outside 50 to 800 euros says so and nothing is sent", async () => {
    const bodies = serveSave(saved);
    const { user } = await openProfile();
    await press(user, "Editar meta pessoal");
    for (const text of ["30", "900"]) {
      await user.clear(goalField());
      await user.type(goalField(), text);
      expect(await screen.findByText("A meta tem de estar entre 50 € e 800 €.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Guardar alterações" })).toBeDisabled();
    }
    expect(bodies).toEqual([]);
  });

  it("F-190: the people counter stops at 1 and at 12", async () => {
    const { user } = await openProfile({ ...saved, household_size: 12 });
    await press(user, "Editar pessoas na casa");
    expect(screen.getByRole("button", { name: "Mais uma pessoa" })).toBeDisabled();
    await press(user, "Menos uma pessoa");
    await press(user, "Mais uma pessoa");
    expect(screen.getByRole("button", { name: "Mais uma pessoa" })).toBeDisabled();
    expect(counter()).toHaveTextContent("Sem alterações");
  });

  it("F-190: with no people indicated, «Mais uma pessoa» gives 1 and «Menos uma pessoa» is off", async () => {
    const bodies = serveSave(saved);
    const { user } = await openProfile({ ...saved, household_size: null });
    await press(user, "Definir pessoas na casa");
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Menos uma pessoa" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Não indicar" })).not.toBeInTheDocument();
    await press(user, "Mais uma pessoa");
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Menos uma pessoa" })).toBeDisabled();
    await press(user, "Guardar alterações");
    expect(await screen.findByText("Perfil guardado.")).toBeInTheDocument();
    expect(bodies).toEqual([{ household_size: 1 }]);
  });

  it("F-190: «Não indicar» sends null for the people", async () => {
    const bodies = serveSave(saved);
    const { user } = await openProfile();
    await press(user, "Editar pessoas na casa");
    await press(user, "Não indicar");
    await press(user, "Guardar alterações");
    expect(await screen.findByText("Perfil guardado.")).toBeInTheDocument();
    expect(bodies).toEqual([{ household_size: null }]);
  });

  it("F-190: a missing consent saves nothing and takes the person to the policy", async () => {
    let changed = false;
    server.use(
      http.get(`${API}/v1/me`, () => HttpResponse.json(changed ? { ...me, current_privacy_version: "2027-01-01" } : me)),
      http.patch(`${API}/v1/me/profile`, () => {
        changed = true;
        return HttpResponse.json(errorBody("privacy_consent_required", "x"), { status: 403 });
      }),
    );
    const { user, router } = await openProfile();
    await press(user, "Editar pessoas na casa");
    await press(user, "Mais uma pessoa");
    await press(user, "Guardar alterações");
    await waitFor(() => expect(router.state.location.pathname).toBe("/privacidade"));
    expect(screen.queryByText("Perfil guardado.")).not.toBeInTheDocument();
  });

  it("F-190: ?editar=meta opens the editing on the goal, and the parameter goes away on saving and on cancelling", async () => {
    serveSave(saved);
    const first = await openProfile(saved, "/definicoes/perfil?editar=meta");
    expect(goalField()).toHaveFocus();
    await press(first.user, "Cancelar");
    expect(await screen.findByRole("heading", { level: 2, name: "Perfil" })).toBeInTheDocument();
    expect(first.router.state.location.search).toBe("");

    await act(() => first.router.navigate("/definicoes/perfil?editar=meta"));
    await user_clearAndSave(first.user);
    expect(first.router.state.location.search).toBe("");
  });

  it("F-190: the list of merchants failing shows a notice, the rest stays editable and the saved merchants are kept", async () => {
    server.use(http.get(`${API}/v1/merchants`, () => HttpResponse.json(errorBody("internal_error", "x"), { status: 500 })));
    const bodies = serveSave(saved);
    const { user } = await openProfile();
    await press(user, "Editar supermercados");
    expect(await screen.findByText("Não foi possível carregar os supermercados.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
    await press(user, "Mais uma pessoa");
    await press(user, "Guardar alterações");
    expect(await screen.findByText("Perfil guardado.")).toBeInTheDocument();
    expect(bodies).toEqual([{ household_size: 3 }]);
  });

  it("F-190: a saved merchant the API no longer lists is kept unless the merchants are touched", async () => {
    const old = { ...saved, merchants: ["LIDL", "COVIRAN"] };
    const bodies = serveSave(old);
    const { user } = await openProfile(old);
    expect(screen.getByText("Lidl")).toBeInTheDocument();
    expect(screen.getByText("COVIRAN")).toBeInTheDocument();
    await press(user, "Editar pessoas na casa");
    await press(user, "Mais uma pessoa");
    await press(user, "Guardar alterações");
    expect(await screen.findByText("Perfil guardado.")).toBeInTheDocument();
    expect(bodies).toEqual([{ household_size: 3 }]);

    await press(user, "Editar supermercados");
    await user.click(await screen.findByRole("checkbox", { name: "Aldi" }));
    await press(user, "Guardar alterações");
    await waitFor(() => expect(bodies).toHaveLength(2));
    expect(bodies[1]).toEqual({ merchants: ["LIDL", "ALDI"] });
  });

  it("F-190: nothing of the profile reaches localStorage or sessionStorage", async () => {
    serveSave(saved);
    const { user } = await openProfile();
    await press(user, "Editar meta pessoal");
    await user.clear(goalField());
    await user.type(goalField(), "400");
    await press(user, "Guardar alterações");
    await screen.findByText("Perfil guardado.");
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});

async function user_clearAndSave(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole("heading", { level: 1, name: "Editar perfil" });
  await user.clear(goalField());
  await user.type(goalField(), "310");
  await user.click(screen.getByRole("button", { name: "Guardar alterações" }));
  await screen.findByText("Perfil guardado.");
}
