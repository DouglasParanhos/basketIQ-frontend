import { screen, waitFor } from "@testing-library/react";
import { delay, http, HttpResponse, type JsonBodyType } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { routes } from "../../App";
import { emptyProfile, me, profile } from "../../test/fixtures";
import { NAV_NAME } from "../../test/nav";
import { renderRoutes } from "../../test/render";
import { API, errorBody, server } from "../../test/server";

const PROFILE = `${API}/v1/me/profile`;

let profileRequests = 0;

function serveProfileResponse(body: JsonBodyType, options: { status?: number; wait?: number } = {}) {
  server.use(
    http.get(PROFILE, async () => {
      profileRequests += 1;
      if (options.wait) await delay(options.wait);
      return HttpResponse.json(body, { status: options.status ?? 200 });
    }),
  );
}

const renderApp = (path: string) => renderRoutes(routes, path);

// An account that existed before the onboarding: the backend marked it as finished and left the values empty.
const migrated = emptyProfile({ onboarding_completed_at: "2026-10-31T00:00:00Z" });

beforeEach(() => {
  profileRequests = 0;
});

describe("the onboarding guard (spec 010, US3)", () => {
  it("F-115: an account that has not finished the onboarding is sent to /boas-vindas from any private page", async () => {
    serveProfileResponse(emptyProfile());
    const { router } = renderApp("/compras");
    expect(await screen.findByRole("heading", { level: 1, name: "Qual é o seu objetivo com a aplicação?" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/boas-vindas");
    expect(screen.queryByRole("navigation", { name: NAV_NAME })).not.toBeInTheDocument();
  });

  it("F-115: an account from before the onboarding (finished and empty) is not interrupted", async () => {
    serveProfileResponse(migrated);
    const { router } = renderApp("/compras");
    expect(await screen.findByRole("heading", { level: 1, name: "Talões" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/compras");
    expect(screen.getByRole("navigation", { name: NAV_NAME })).toBeInTheDocument();
  });

  it("F-115: an account from before the onboarding that opens /boas-vindas goes to the Início", async () => {
    serveProfileResponse(migrated);
    const { router } = renderApp("/boas-vindas");
    expect(await screen.findByRole("heading", { level: 1, name: "Início" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
  });

  it("F-115: the privacy consent comes before the onboarding", async () => {
    server.use(http.get(`${API}/v1/me`, () => HttpResponse.json({ ...me, privacy_version: "2026-01-01" })));
    serveProfileResponse(emptyProfile());
    const { router } = renderApp("/compras");
    await waitFor(() => expect(router.state.location.pathname).toBe("/privacidade"));
    expect(profileRequests).toBe(0);
  });

  it("F-115: an account that finished the onboarding is not interrupted", async () => {
    serveProfileResponse(profile);
    const { router } = renderApp("/");
    expect(await screen.findByRole("heading", { level: 1, name: "Início" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
    expect(screen.getByRole("navigation", { name: NAV_NAME })).toBeInTheDocument();
  });

  it("F-115: opening /boas-vindas after finishing leads to the Início", async () => {
    serveProfileResponse(profile);
    const { router } = renderApp("/boas-vindas");
    expect(await screen.findByRole("heading", { level: 1, name: "Início" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
  });

  it("F-115: while the profile loads there is neither the Início nor the navigation bar, only the loading indicator", async () => {
    serveProfileResponse(emptyProfile(), { wait: 150 });
    const { router } = renderApp("/");
    await waitFor(() => expect(profileRequests).toBe(1));
    expect(screen.queryByRole("heading", { level: 1, name: "Início" })).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: NAV_NAME })).not.toBeInTheDocument();
    expect(screen.getByText(/A carregar/)).toBeInTheDocument();
    await screen.findByRole("heading", { level: 1, name: "Qual é o seu objetivo com a aplicação?" });
    expect(router.state.location.pathname).toBe("/boas-vindas");
  });

  it("F-115: if the profile cannot be read the person is not locked out", async () => {
    serveProfileResponse(errorBody("internal_error", "x"), { status: 500 });
    const { router } = renderApp("/");
    expect(await screen.findByRole("heading", { level: 1, name: "Início" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
  });

  it("F-115: the operator page is outside the guard", async () => {
    server.use(
      http.get(`${API}/v1/me`, () => HttpResponse.json({ ...me, role: "admin" })),
      http.get(`${API}/v1/admin/*`, () => HttpResponse.json(errorBody("not_found", "x"), { status: 404 })),
    );
    serveProfileResponse(emptyProfile());
    const { router } = renderApp("/operador");
    await waitFor(() => expect(router.state.location.pathname).toBe("/operador"));
    expect(profileRequests).toBe(0);
  });
});
