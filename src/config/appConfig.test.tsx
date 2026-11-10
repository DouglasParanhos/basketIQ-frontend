import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { LoginPage } from "../features/auth/LoginPage";
import AdminPage from "../features/admin/AdminPage";
import { renderRoutes } from "../test/render";
import { anonymous, API, errorBody, failConfig, server, serveConfig } from "../test/server";
import { SettingsLayout } from "../features/settings/SettingsLayout";
import { DocumentTitle, FALLBACK_APP_NAME, useSmartListEnabled } from "./appConfig";

const serveName = (name: string) =>
  server.use(http.get(`${API}/v1/config`, () => HttpResponse.json({ app_name: name })));

const login = [
  { path: "/login", element: (<><DocumentTitle /><LoginPage /></>) },
];

describe("customer-facing name comes from the backend (CFG-02)", () => {
  it("login shows the configured name, not a value fixed in the frontend", async () => {
    anonymous();
    serveName("Mercado do Zé");
    renderRoutes(login, "/login");
    expect(await screen.findByRole("heading", { level: 1, name: "Mercado do Zé" })).toBeInTheDocument();
    expect(screen.queryByText(/Super Mercado/i)).not.toBeInTheDocument();
  });

  it("F-246: the browser tab title is «screen · configured name»", async () => {
    anonymous();
    serveName("Mercado do Zé");
    renderRoutes(login, "/login");
    await waitFor(() => expect(document.title).toBe("Entrar · Mercado do Zé"));
  });

  it("settings footer shows the configured name", async () => {
    serveName("Mercado do Zé");
    renderRoutes([{ path: "/definicoes", element: <SettingsLayout />, children: [{ path: "perfil", element: null }] }], "/definicoes/perfil");
    expect(await screen.findByText("Mercado do Zé")).toBeInTheDocument();
  });

  it("uses the default name from the backend file value (Super Mercado)", async () => {
    anonymous();
    renderRoutes(login, "/login");
    expect(await screen.findByText("Super Mercado")).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe("Entrar · Super Mercado"));
  });

  it("falls back to the built-in name only if the request fails", async () => {
    anonymous();
    server.use(http.get(`${API}/v1/config`, () => HttpResponse.json(errorBody("internal_error", "x"), { status: 500 })));
    renderRoutes(login, "/login");
    expect(FALLBACK_APP_NAME).toBe("Super Mercado");
    expect(await screen.findByRole("heading", { level: 1, name: "Super Mercado" })).toBeInTheDocument();
  });
});

describe("operator configuration view (CFG-02)", () => {
  it("shows each key of the file, read-only", async () => {
    server.use(
      http.get(`${API}/v1/admin/metrics`, () => HttpResponse.json({ uploads: { total: 0, by_status: {} } })),
      http.get(`${API}/v1/admin/config`, () =>
        HttpResponse.json({ app_name_for_customer: "Super Mercado", llm_enabled: true }),
      ),
    );
    const user = userEvent.setup();
    renderRoutes([{ path: "/operador", element: <AdminPage /> }], "/operador");
    await user.click(await screen.findByRole("tab", { name: "Configuração" }));
    expect(await screen.findByText("APP_NAME_FOR_CUSTOMER")).toBeInTheDocument();
    expect(screen.getByText("LLM_ENABLED").nextSibling).toHaveTextContent("true");
    expect(screen.getByText(/Só leitura/)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});

describe("F-86: the smart-list option comes from the public configuration", () => {
  function Probe() {
    return <p>{useSmartListEnabled() ? "lista ligada" : "lista desligada"}</p>;
  }
  const probe = [{ path: "/", element: <Probe /> }];

  it("is on only when the backend says true", async () => {
    serveConfig({ app_name: "Super Mercado", smart_list_enabled: true });
    renderRoutes(probe, "/");
    expect(await screen.findByText("lista ligada")).toBeInTheDocument();
  });

  it("is off when the backend says false", async () => {
    serveConfig({ app_name: "Super Mercado", smart_list_enabled: false });
    renderRoutes(probe, "/");
    await waitFor(() => expect(screen.getByText("lista desligada")).toBeInTheDocument());
    expect(screen.queryByText("lista ligada")).not.toBeInTheDocument();
  });

  it("is off when the field is missing", async () => {
    serveConfig({ app_name: "Super Mercado" });
    renderRoutes(probe, "/");
    await waitFor(() => expect(screen.getByText("lista desligada")).toBeInTheDocument());
  });

  it("is off while the request is pending and turns on when it arrives", async () => {
    server.use(
      http.get(`${API}/v1/config`, async () => {
        await delay(50);
        return HttpResponse.json({ app_name: "Super Mercado", smart_list_enabled: true });
      }),
    );
    renderRoutes(probe, "/");
    expect(screen.getByText("lista desligada")).toBeInTheDocument();
    expect(await screen.findByText("lista ligada")).toBeInTheDocument();
  });

  it("is off when the request fails", async () => {
    failConfig();
    const { client } = renderRoutes(probe, "/");
    // useAppConfig retries once (about 1 s) before the query settles in error.
    await waitFor(() => expect(client.getQueryState(["app-config"])?.status).toBe("error"), { timeout: 4000 });
    expect(screen.getByText("lista desligada")).toBeInTheDocument();
    expect(screen.queryByText("lista ligada")).not.toBeInTheDocument();
  });
});
