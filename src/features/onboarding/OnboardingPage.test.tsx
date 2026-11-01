import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { merchants, profile } from "../../test/fixtures";
import { API, errorBody, servePatch, serveProfile, server } from "../../test/server";
import { allDone, BANNED, openOnboarding, press, title, type User } from "./testing";

let patches: Record<string, unknown>[] = [];

beforeEach(() => {
  serveProfile();
  patches = servePatch();
});


describe("the four steps (spec 010, US1)", () => {
  it("F-113: step 1 offers the three goals and «Todas as anteriores», in European Portuguese, with no promise of the Lista", async () => {
    await openOnboarding();
    expect(title()).toHaveTextContent("Qual é o seu objetivo com a aplicação?");
    expect(screen.getByText("Escolha quantos quiser.")).toBeInTheDocument();
    for (const name of [/Organizar as minhas finanças/, /Ajuda com a lista de compras/, /Gastar menos nas compras/, /Todas as anteriores/]) {
      expect(screen.getByRole("checkbox", { name })).not.toBeChecked();
    }
    expect(document.body.textContent).not.toMatch(BANNED);
    expect(screen.getByText("Passo 1 de 4")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Voltar" })).not.toBeInTheDocument();
  });

  it("F-113: «Todas as anteriores» marks the three goals; marking the three marks it; clearing one clears it", async () => {
    const { user } = await openOnboarding();
    const all = screen.getByRole("checkbox", { name: /Todas as anteriores/ });
    await user.click(all);
    for (const name of [/Organizar as minhas finanças/, /Ajuda com a lista de compras/, /Gastar menos nas compras/]) {
      expect(screen.getByRole("checkbox", { name })).toBeChecked();
    }
    await user.click(screen.getByRole("checkbox", { name: /Gastar menos nas compras/ }));
    expect(all).not.toBeChecked();
    await user.click(screen.getByRole("checkbox", { name: /Gastar menos nas compras/ }));
    expect(all).toBeChecked();
  });

  it("F-113: step 2 starts at 2 «pessoas», stops at 1 («pessoa») and at 12", async () => {
    const { user } = await openOnboarding();
    await press(user, "Avançar");
    expect(title()).toHaveTextContent("Quantas pessoas vivem em sua casa?");
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("pessoas")).toBeInTheDocument();
    await press(user, "Menos uma pessoa");
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("pessoa")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Menos uma pessoa" })).toBeDisabled();
    for (let i = 0; i < 11; i++) await press(user, "Mais uma pessoa");
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mais uma pessoa" })).toBeDisabled();
  });

  it("F-113: step 3 shows the merchants the API serves, with initial and name; a new one needs no code", async () => {
    server.use(http.get(`${API}/v1/merchants`, () => HttpResponse.json([...merchants, { id: "NOVO", name: "Mercado Novo" }])));
    const { user } = await openOnboarding();
    await press(user, "Avançar");
    await press(user, "Avançar");
    expect(title()).toHaveTextContent("Onde costuma fazer compras?");
    expect(await screen.findAllByRole("checkbox")).toHaveLength(8);
    expect(screen.getByRole("checkbox", { name: "Mercado Novo" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "El Corte Inglés" })).toBeInTheDocument();
    expect(screen.getByText("EC")).toBeInTheDocument();
    expect(screen.getByText("P")).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "Lidl" }));
    expect(screen.getByRole("checkbox", { name: "Lidl" })).toBeChecked();
  });

  it("F-113: step 4 shows 300 € per month between 50 € and 800 €; «Ainda não sei» disables the bar and explains where to set it later", async () => {
    const { user } = await openOnboarding();
    for (let i = 0; i < 3; i++) await press(user, "Avançar");
    expect(title()).toHaveTextContent("Qual é a sua meta pessoal por mês?");
    const value = screen.getByTestId("goal-value");
    expect(value.textContent?.replace(/\s/g, " ")).toBe("300 €");
    expect(screen.getByText("por mês")).toBeInTheDocument();
    expect(screen.getByText("Por mês. Pode mudá-la quando quiser.")).toBeInTheDocument();
    const bar = screen.getByRole("slider", { name: /meta pessoal/i });
    expect(bar).toHaveAttribute("min", "50");
    expect(bar).toHaveAttribute("max", "800");
    expect(screen.getByText(/^50\s€$/)).toBeInTheDocument();
    expect(screen.getByText(/^800\s€$/)).toBeInTheDocument();
    fireEvent.change(bar, { target: { value: "420" } });
    expect(value.textContent?.replace(/\s/g, " ")).toBe("420 €");

    await press(user, "Ainda não sei");
    expect(bar).toBeDisabled();
    expect(value).toHaveTextContent("Ainda não sei");
    expect(screen.getByText("Pode definir a sua meta pessoal mais tarde, nas Definições.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Definir um valor" })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Calculamos pela sua média|orçamento/i);
  });

  it("F-113: the progress goes 25, 50, 75 and 100 % with «Passo N de 4»", async () => {
    const { user } = await openOnboarding();
    for (const [n, percent] of [[1, 25], [2, 50], [3, 75], [4, 100]] as const) {
      expect(screen.getByText(`Passo ${n} de 4`)).toBeInTheDocument();
      expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", String(percent));
      if (n < 4) await press(user, "Avançar");
    }
    expect(screen.getByRole("button", { name: "Concluir" })).toBeInTheDocument();
  });

  it("F-113: «Voltar» goes to the step before and keeps the answers", async () => {
    const { user } = await openOnboarding();
    await press(user, "Avançar");
    await press(user, "Mais uma pessoa");
    await press(user, "Avançar");
    await press(user, "Voltar");
    expect(title()).toHaveTextContent("Quantas pessoas vivem em sua casa?");
    expect(screen.getByText("3")).toBeInTheDocument();
    await press(user, "Voltar");
    expect(screen.queryByRole("button", { name: "Voltar" })).not.toBeInTheDocument();
  });

  it("F-113: «Concluir» sends one PATCH, shows «Tudo pronto», and «Ir para o início» leads to the Início", async () => {
    const { user, router } = await openOnboarding();
    await user.click(screen.getByRole("checkbox", { name: /Organizar as minhas finanças/ }));
    await press(user, "Avançar");
    await press(user, "Avançar");
    await user.click(await screen.findByRole("checkbox", { name: "Lidl" }));
    await press(user, "Avançar");
    await press(user, "Concluir");

    expect(await allDone()).toBeInTheDocument();
    expect(screen.getByText("Pode editar estas respostas no Perfil a qualquer momento.")).toBeInTheDocument();
    expect(patches).toEqual([
      { goals: ["finances"], household_size: 2, merchants: ["LIDL"], monthly_goal_cents: 30000, onboarding_completed: true },
    ]);
    expect(router.state.location.pathname).toBe("/boas-vindas");

    await press(user, "Ir para o início");
    expect(await screen.findByText("Início de teste")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
    expect(patches).toHaveLength(1);
  });
});

describe("«Tudo pronto» (spec 010, US1 and US3)", () => {
  it("F-113: a refresh of the profile while «Tudo pronto» is shown does not take the person away", async () => {
    const { user, client } = await openOnboarding();
    for (let i = 0; i < 4; i++) await press(user, "Saltar");
    await allDone();
    serveProfile(profile); // the server now says the onboarding is finished
    await client.invalidateQueries({ queryKey: ["profile"] });
    await waitFor(() => expect(client.isFetching()).toBe(0));
    expect(screen.getByRole("heading", { level: 1, name: "Tudo pronto" })).toBeInTheDocument();
  });
});

describe("only what the person confirmed is saved (spec 010, US2)", () => {
  /** Runs the four steps with the given buttons and returns the body of the one PATCH. */
  async function through(buttons: ("Avançar" | "Saltar" | "Concluir")[], before?: (user: User) => Promise<void>) {
    const { user } = await openOnboarding();
    if (before) await before(user);
    for (const name of buttons) await press(user, name);
    await allDone();
    expect(patches).toHaveLength(1);
    return patches[0];
  }

  it("F-114: skipping the four steps sends only onboarding_completed", async () => {
    expect(await through(["Saltar", "Saltar", "Saltar", "Saltar"])).toEqual({ onboarding_completed: true });
  });

  it("F-114: «Saltar» on the last step finishes with no goal", async () => {
    const body = await through(["Avançar", "Avançar", "Avançar", "Saltar"], async (user) => {
      await user.click(screen.getByRole("checkbox", { name: /Gastar menos nas compras/ }));
    });
    expect(body).toEqual({ goals: ["savings"], household_size: 2, onboarding_completed: true });
  });

  it("F-114: 3 people confirmed with «Avançar» and the goal skipped saves only the 3 people", async () => {
    const { user } = await openOnboarding();
    await press(user, "Saltar");
    await press(user, "Mais uma pessoa");
    await press(user, "Avançar");
    await press(user, "Saltar");
    await press(user, "Saltar");
    await allDone();
    expect(patches).toEqual([{ household_size: 3, onboarding_completed: true }]);
  });

  it("F-114: «Avançar» on the suggested 2 people saves 2, because it confirms what the screen shows", async () => {
    expect(await through(["Saltar", "Avançar", "Saltar", "Saltar"])).toEqual({ household_size: 2, onboarding_completed: true });
  });

  it("F-114: goals and merchants confirmed with nothing chosen save nothing of them", async () => {
    expect(await through(["Avançar", "Saltar", "Avançar", "Saltar"])).toEqual({ onboarding_completed: true });
  });

  it("F-114: «Concluir» on the suggested 300 € confirms it and sends it in whole cents", async () => {
    expect(await through(["Saltar", "Saltar", "Saltar", "Concluir"])).toEqual({ monthly_goal_cents: 30000, onboarding_completed: true });
  });

  it("F-114: «Ainda não sei» followed by «Concluir» sends no goal", async () => {
    const { user } = await openOnboarding();
    for (let i = 0; i < 3; i++) await press(user, "Saltar");
    await press(user, "Ainda não sei");
    await press(user, "Concluir");
    await allDone();
    expect(patches).toEqual([{ onboarding_completed: true }]);
  });

  it("F-114: going back to a confirmed step and skipping it keeps the confirmation", async () => {
    const { user } = await openOnboarding();
    await press(user, "Saltar");
    await press(user, "Mais uma pessoa");
    await press(user, "Avançar");
    await press(user, "Voltar");
    await press(user, "Saltar");
    await press(user, "Saltar");
    await press(user, "Saltar");
    await allDone();
    expect(patches).toEqual([{ household_size: 3, onboarding_completed: true }]);
  });

  it("F-114: the body never carries null, empty lists or the suggestions the person skipped", async () => {
    const body = await through(["Saltar", "Saltar", "Saltar", "Saltar"]);
    expect(JSON.stringify(body)).not.toMatch(/null|\[\]|household_size|monthly_goal_cents/);
  });
});

describe("failures of the merchants list and of the saving (spec 010, US4)", () => {
  it("F-116: when GET /v1/merchants fails the step offers «Tentar de novo» and can be skipped", async () => {
    let calls = 0;
    server.use(
      http.get(`${API}/v1/merchants`, () => {
        calls += 1;
        // Fails when the page asks and again when the step mounts (the query retries on mount), then recovers.
        return calls <= 2 ? HttpResponse.json(errorBody("internal_error", "x"), { status: 500 }) : HttpResponse.json(merchants);
      }),
    );
    const { user } = await openOnboarding();
    await press(user, "Avançar");
    await press(user, "Avançar");
    expect(await screen.findByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Saltar" })).toBeEnabled();
    await press(user, "Tentar de novo");
    expect(await screen.findByRole("checkbox", { name: "Lidl" })).toBeInTheDocument();
  });

  it("F-116: a failed save keeps the answers and repeating it sends the same body", async () => {
    let fail = true;
    server.use(
      http.patch(`${API}/v1/me/profile`, async ({ request }) => {
        patches.push((await request.json()) as Record<string, unknown>);
        return fail ? HttpResponse.json(errorBody("internal_error", "x"), { status: 500 }) : HttpResponse.json({ ...profile });
      }),
    );
    const { user } = await openOnboarding();
    await press(user, "Saltar");
    await press(user, "Mais uma pessoa");
    await press(user, "Avançar");
    await press(user, "Saltar");
    await press(user, "Saltar");
    expect(await screen.findByText("Não foi possível guardar. Tente de novo.")).toBeInTheDocument();
    expect(title()).toHaveTextContent("Qual é a sua meta pessoal por mês?");
    fail = false;
    await press(user, "Tentar de novo");
    expect(await allDone()).toBeInTheDocument();
    expect(patches).toEqual([
      { household_size: 3, onboarding_completed: true },
      { household_size: 3, onboarding_completed: true },
    ]);
  });

  it("F-116: a policy that changed (403 privacy_consent_required) explains why and links to the policy", async () => {
    server.use(http.patch(`${API}/v1/me/profile`, () => HttpResponse.json(errorBody("privacy_consent_required", "x"), { status: 403 })));
    const { user } = await openOnboarding();
    for (let i = 0; i < 3; i++) await press(user, "Saltar");
    await press(user, "Saltar");
    expect(await screen.findByText("A política de privacidade mudou. Confirme-a para continuar.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver a política de privacidade" })).toHaveAttribute("href", "/privacidade");
  });

  it("F-116: a rejected value (422) shows the message the API sent", async () => {
    server.use(
      http.patch(`${API}/v1/me/profile`, () =>
        HttpResponse.json(errorBody("validation_error", "Indique entre 1 e 12 pessoas."), { status: 422 }),
      ),
    );
    const { user } = await openOnboarding();
    for (let i = 0; i < 4; i++) await press(user, "Saltar");
    expect(await screen.findByText("Indique entre 1 e 12 pessoas.")).toBeInTheDocument();
  });

  it("F-116: nothing is written to localStorage or sessionStorage along the whole run", async () => {
    const writes: string[] = [];
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      writes.push(key);
      return original.call(this, key, value);
    };
    try {
      const { user } = await openOnboarding();
      await user.click(screen.getByRole("checkbox", { name: /Todas as anteriores/ }));
      for (let i = 0; i < 3; i++) await press(user, "Avançar");
      await press(user, "Concluir");
      await allDone();
      expect(writes).toEqual([]);
    } finally {
      Storage.prototype.setItem = original;
    }
  });
});

describe("values already saved (spec 010, US4)", () => {
  it("F-116: a profile with values but no conclusion opens each step with them, and skipping does not erase them", async () => {
    serveProfile({ ...profile, onboarding_completed_at: null, household_size: 4, goals: ["savings"], merchants: ["ALDI"], monthly_goal_cents: 42000 });
    const { user } = await openOnboarding();
    expect(screen.getByRole("checkbox", { name: /Gastar menos nas compras/ })).toBeChecked();
    await press(user, "Saltar");
    expect(screen.getByText("4")).toBeInTheDocument();
    await press(user, "Saltar");
    expect(await screen.findByRole("checkbox", { name: "Aldi" })).toBeChecked();
    await press(user, "Saltar");
    expect(screen.getByTestId("goal-value").textContent?.replace(/\s/g, " ")).toBe("420 €");
    await press(user, "Saltar");
    await allDone();
    expect(patches).toEqual([{ onboarding_completed: true }]);
  });

  it("F-116: reloading the page returns to step 1 with the saved values, without the intermediate answers", async () => {
    const first = await openOnboarding();
    await press(first.user, "Saltar");
    await press(first.user, "Mais uma pessoa");
    expect(screen.getByText("3")).toBeInTheDocument();
    first.unmount();
    const second = await openOnboarding();
    expect(screen.getByText("Passo 1 de 4")).toBeInTheDocument();
    await press(second.user, "Saltar");
    expect(screen.getByText("2")).toBeInTheDocument();
    await waitFor(() => expect(within(document.body).queryByText("3")).not.toBeInTheDocument());
  });
});
