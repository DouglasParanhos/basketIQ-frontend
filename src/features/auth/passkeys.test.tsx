import * as webauthn from "@simplewebauthn/browser";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { routes } from "../../App";
import { formatDate } from "../../lib/format";
import { emptyProfile, me, overviewEmpty, overviewGreen } from "../../test/fixtures";
import { renderRoutes } from "../../test/render";
import { API, anonymous, errorBody, server, serveOverview, servePatch, serveProfile } from "../../test/server";
import { HomeRoute } from "../home/HomeRoute";
import { LoginPage } from "./LoginPage";

vi.mock("@simplewebauthn/browser", () => ({
  platformAuthenticatorIsAvailable: vi.fn(),
  startAuthentication: vi.fn(),
  startRegistration: vi.fn(),
}));
const browser = vi.mocked(webauthn);

const LOGIN_OPTIONS = { challenge: "c-login", rpId: "localhost", userVerification: "required", allowCredentials: [{ id: "k1", type: "public-key", transports: ["internal"] }], hints: ["client-device"] };
const REGISTER_OPTIONS = { challenge: "c-register", rp: { id: "localhost", name: "Super Mercado" }, user: { id: "dTE", name: "maria", displayName: "Maria" }, pubKeyCredParams: [] };
const ASSERTION = { id: "k1", rawId: "k1", type: "public-key", response: { clientDataJSON: "a", authenticatorData: "b", signature: "c", userHandle: "dTE" }, clientExtensionResults: {} };
const CREDENTIAL = { id: "k2", rawId: "k2", type: "public-key", response: { clientDataJSON: "a", attestationObject: "b", transports: ["internal"] }, clientExtensionResults: {} };
const PASSKEY = { id: "k1", created_at: "2026-11-01T10:00:00Z", last_used_at: null };

const named = (name: string) => Object.assign(new Error(name), { name });

/** A button once its options are loaded (it stays disabled until then). */
async function enabledButton(name: string | RegExp) {
  const button = await screen.findByRole("button", { name });
  await waitFor(() => expect(button).toBeEnabled());
  return button;
}

beforeEach(() => {
  browser.platformAuthenticatorIsAvailable.mockResolvedValue(true);
  browser.startAuthentication.mockResolvedValue(ASSERTION as never);
  browser.startRegistration.mockResolvedValue(CREDENTIAL as never);
});

/** The sign-in endpoints; `verify` answers the assertion (204 signs the person in). Returns what the API saw, in order. */
function serveSignIn(verify = 204) {
  const seen: string[] = [];
  let signedIn = false;
  anonymous();
  server.use(
    http.get(`${API}/v1/me`, () => (signedIn ? HttpResponse.json(me) : HttpResponse.json(errorBody("unauthenticated", "x"), { status: 401 }))),
    http.post(`${API}/v1/auth/passkey/options`, () => {
      seen.push("options");
      return HttpResponse.json(LOGIN_OPTIONS);
    }),
    http.post(`${API}/v1/auth/passkey/verify`, async ({ request }) => {
      seen.push(`verify:${(await request.json() as { id: string }).id}`);
      if (verify !== 204) return HttpResponse.json(errorBody(verify === 429 ? "rate_limited" : "passkey_invalid", "x"), { status: verify });
      signedIn = true;
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return seen;
}

const openLogin = () => {
  const view = renderRoutes([{ path: "/login", element: <LoginPage /> }, { path: "/", element: <p>início</p> }], "/login");
  return { ...view, user: userEvent.setup() };
};

describe("login with a passkey (spec 016)", () => {
  it("F-216: on a phone that can, «Entrar com passkey» signs in with the phone's lock and opens the Início", async () => {
    const seen = serveSignIn();
    const { user } = openLogin();
    const button = await enabledButton(/Entrar com passkey/);
    expect(button).toHaveTextContent("Digital, rosto ou PIN do telemóvel");
    await user.click(button);
    expect(await screen.findByText("início")).toBeInTheDocument();
    expect(browser.startAuthentication).toHaveBeenCalledWith({ optionsJSON: LOGIN_OPTIONS });
    expect(seen.slice(0, 2)).toEqual(["options", "verify:k1"]);
  });

  it("F-216: without passkey support there is only «Entrar com Google» and no request", async () => {
    browser.platformAuthenticatorIsAvailable.mockResolvedValue(false);
    const seen = serveSignIn();
    openLogin();
    await screen.findByRole("link", { name: /Entrar com Google/ });
    await waitFor(() => expect(browser.platformAuthenticatorIsAvailable).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: /Entrar com passkey/ })).not.toBeInTheDocument();
    expect(seen).toEqual([]);
  });

  it("F-223: a phone that holds no passkey of the app (empty allowCredentials) gets no «Entrar com passkey», so no QR code", async () => {
    const seen = serveSignIn();
    server.use(http.post(`${API}/v1/auth/passkey/options`, () => {
      seen.push("options");
      return HttpResponse.json({ ...LOGIN_OPTIONS, allowCredentials: [] });
    }));
    openLogin();
    await waitFor(() => expect(seen).toEqual(["options"]));
    await screen.findByRole("link", { name: /Entrar com Google/ });
    expect(screen.queryByRole("button", { name: /Entrar com passkey/ })).not.toBeInTheDocument();
  });

  it.each([
    ["the person cancels the prompt", () => browser.startAuthentication.mockRejectedValue(named("NotAllowedError")), 204, "O início de sessão foi cancelado. Pode tentar novamente quando quiser."],
    ["the passkey is no longer valid", () => undefined, 401, "Esta passkey já não é válida. Entre com Google."],
    ["too many attempts", () => undefined, 429, "Demasiadas tentativas. Aguarde um minuto e tente novamente."],
  ])("F-216: %s → a clear message, and the person stays on the login", async (_case, arrange, verify, message) => {
    arrange();
    serveSignIn(verify);
    const { user } = openLogin();
    const button = await enabledButton(/Entrar com passkey/);
    await user.click(button);
    expect(await screen.findByRole("status")).toHaveTextContent(message);
    expect(screen.queryByText("início")).not.toBeInTheDocument();
  });

  it("F-219: the options are fetched when the screen opens, so the tap opens the phone's lock with no request in between (iPhone)", async () => {
    const seen = serveSignIn();
    let requestsAtPrompt: string[] = [];
    browser.startAuthentication.mockImplementation(async () => {
      requestsAtPrompt = [...seen];
      return ASSERTION as never;
    });
    const { user } = openLogin();
    const button = await enabledButton(/Entrar com passkey/);
    expect(seen).toEqual(["options"]);
    await user.click(button);
    await screen.findByText("início");
    expect(requestsAtPrompt).toEqual(["options"]);
  });
});

function servePasskeys(list: typeof PASSKEY[]) {
  const seen: string[] = [];
  let current = [...list];
  server.use(
    http.get(`${API}/v1/me/passkeys`, () => HttpResponse.json(current)),
    http.post(`${API}/v1/me/passkeys/options`, () => {
      seen.push("options");
      return HttpResponse.json(REGISTER_OPTIONS);
    }),
    http.post(`${API}/v1/me/passkeys`, async ({ request }) => {
      seen.push(`add:${(await request.json() as { id: string }).id}`);
      const added = { id: "k2", created_at: "2026-11-04T10:00:00Z", last_used_at: null };
      current = [...current, added];
      return HttpResponse.json(added, { status: 201 });
    }),
    http.delete(`${API}/v1/me/passkeys/:id`, ({ params }) => {
      seen.push(`remove:${String(params.id)}`);
      current = current.filter((p) => p.id !== params.id);
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return seen;
}

async function openAccount() {
  const view = { ...renderRoutes(routes, "/definicoes/conta"), user: userEvent.setup() };
  await screen.findByRole("heading", { level: 2, name: "Entrar com passkey" });
  return view;
}

describe("Conta › Entrar com passkey (spec 016)", () => {
  it("F-217: lists the passkeys with their dates and removes one after a confirmation", async () => {
    const seen = servePasskeys([PASSKEY]);
    const { user } = await openAccount();
    expect(await screen.findByText(`Passkey criada a ${formatDate(PASSKEY.created_at)}`)).toBeInTheDocument();
    expect(screen.getByText("Ainda não usada")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remover" }));
    expect(screen.getByText("Remover esta passkey?")).toBeInTheDocument();
    expect(seen).not.toContain("remove:k1");
    await user.click(screen.getByRole("button", { name: "Remover passkey" }));
    await waitFor(() => expect(screen.queryByText(/Passkey criada a/)).not.toBeInTheDocument());
    expect(seen).toContain("remove:k1");
  });

  it("F-217: «Adicionar passkey neste telemóvel» creates one with the phone's lock and lists it", async () => {
    const seen = servePasskeys([]);
    const { user } = await openAccount();
    const add = await enabledButton("Adicionar passkey neste telemóvel");
    await user.click(add);
    expect(await screen.findByText(`Passkey criada a ${formatDate("2026-11-04T10:00:00Z")}`)).toBeInTheDocument();
    expect(browser.startRegistration).toHaveBeenCalledWith({ optionsJSON: REGISTER_OPTIONS });
    expect(seen.slice(0, 2)).toEqual(["options", "add:k2"]);
  });

  it("F-217: a phone that already holds a passkey of this account gets a clear message; a cancel shows nothing", async () => {
    servePasskeys([]);
    browser.startRegistration.mockRejectedValueOnce(named("InvalidStateError")).mockRejectedValueOnce(named("NotAllowedError"));
    const { user } = await openAccount();
    const add = await enabledButton("Adicionar passkey neste telemóvel");
    await user.click(add);
    expect(await screen.findByText("Este telemóvel já tem uma passkey desta conta.")).toBeInTheDocument();
    await waitFor(() => expect(add).toBeEnabled());
    await user.click(add);
    await waitFor(() => expect(screen.queryByText("Este telemóvel já tem uma passkey desta conta.")).not.toBeInTheDocument());
    expect(screen.queryAllByRole("alert").filter((el) => el.textContent)).toHaveLength(0); // the global live region exists, empty
  });

  it("F-217: a device without passkeys still lists them, says it cannot create one and asks for no options", async () => {
    browser.platformAuthenticatorIsAvailable.mockResolvedValue(false);
    const seen = servePasskeys([PASSKEY]);
    await openAccount();
    expect(await screen.findByText("Este dispositivo não permite criar passkeys.")).toBeInTheDocument();
    expect(screen.getByText(`Passkey criada a ${formatDate(PASSKEY.created_at)}`)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Adicionar passkey neste telemóvel" })).not.toBeInTheDocument();
    expect(seen).toEqual([]);
  });

  it("F-217: «Eliminar conta» says the passkeys go too", async () => {
    servePasskeys([]);
    renderRoutes(routes, "/definicoes/conta/eliminar");
    expect(await screen.findByText("As passkeys registadas")).toBeInTheDocument();
  });
});

const openHome = () => {
  serveOverview(overviewGreen);
  return { ...renderRoutes([{ path: "/", element: <HomeRoute /> }], "/"), user: userEvent.setup() };
};

describe("Início: the one-time passkey offer (spec 016)", () => {
  it("F-218: «Agora não» keeps the dismissal on the server and the offer goes away", async () => {
    servePasskeys([]);
    const bodies = servePatch();
    const { user } = openHome();
    await screen.findByRole("heading", { name: "Entrar mais depressa" });
    await user.click(screen.getByRole("button", { name: "Agora não" }));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Entrar mais depressa" })).not.toBeInTheDocument());
    expect(bodies).toEqual([{ passkey_offer_dismissed: true }]);
  });

  it("F-218: «Ativar» creates the passkey and the offer is not shown again", async () => {
    const seen = servePasskeys([]);
    const bodies = servePatch();
    const { user } = openHome();
    await screen.findByRole("heading", { name: "Entrar mais depressa" });
    const activate = await enabledButton("Ativar");
    await user.click(activate);
    await waitFor(() => expect(bodies).toEqual([{ passkey_offer_dismissed: true }]));
    expect(seen).toContain("add:k2");
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Entrar mais depressa" })).not.toBeInTheDocument());
  });

  it.each([
    ["already dismissed", () => serveProfile(emptyProfile({ onboarding_completed_at: "2026-10-02T10:00:00Z", passkey_offer_dismissed_at: "2026-11-01T10:00:00Z" }))],
    ["the account already has a passkey", () => servePasskeys([PASSKEY])],
    ["the phone cannot use passkeys", () => browser.platformAuthenticatorIsAvailable.mockResolvedValue(false)],
  ])("F-218: no offer when %s", async (_case, arrange) => {
    servePasskeys([]);
    arrange();
    openHome();
    await screen.findByRole("img", { name: /Anel verde/ });
    await waitFor(() => expect(browser.platformAuthenticatorIsAvailable).toHaveBeenCalled());
    // The offer would appear right after the profile and the passkeys answer: give those requests a moment to land.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole("heading", { name: "Entrar mais depressa" })).not.toBeInTheDocument();
  });
});

describe("Início: no passkey offer on an empty account", () => {
  it("F-218: «A aguardar o seu primeiro talão» covers the page, so the offer waits for the first purchase", async () => {
    servePasskeys([]);
    serveOverview(overviewEmpty);
    renderRoutes([{ path: "/", element: <HomeRoute /> }], "/");
    await screen.findByRole("heading", { name: "A aguardar o seu primeiro talão" });
    expect(screen.queryByRole("heading", { name: "Entrar mais depressa" })).not.toBeInTheDocument();
  });
});
