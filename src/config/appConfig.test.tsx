import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { LoginPage } from "../features/auth/LoginPage";
import AdminPage from "../features/admin/AdminPage";
import { renderRoutes } from "../test/render";
import { API, errorBody, server } from "../test/server";
import { SettingsPage } from "../features/settings/SettingsPage";
import { DocumentTitle, FALLBACK_APP_NAME } from "./appConfig";

const anonymous = () =>
  server.use(
    http.get(`${API}/v1/me`, () => HttpResponse.json(errorBody("unauthenticated", "x"), { status: 401 })),
    http.post(`${API}/v1/auth/refresh`, () => HttpResponse.json(errorBody("unauthenticated", "x"), { status: 401 })),
  );

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
    expect(await screen.findByText("Mercado do Zé")).toBeInTheDocument();
    expect(screen.getByText(/O Mercado do Zé lê os produtos/)).toBeInTheDocument();
    expect(screen.queryByText(/Super Mercado/i)).not.toBeInTheDocument();
  });

  it("the browser tab title follows the configured name", async () => {
    anonymous();
    serveName("Mercado do Zé");
    renderRoutes(login, "/login");
    await waitFor(() => expect(document.title).toBe("Mercado do Zé"));
  });

  it("settings footer shows the configured name", async () => {
    serveName("Mercado do Zé");
    renderRoutes([{ path: "/definicoes", element: <SettingsPage /> }], "/definicoes");
    expect(await screen.findByText(/Mercado do Zé test/)).toBeInTheDocument();
  });

  it("uses the default name from the backend file value (Super Mercado)", async () => {
    anonymous();
    renderRoutes(login, "/login");
    expect(await screen.findByText("Super Mercado")).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe("Super Mercado"));
  });

  it("falls back to the built-in name only if the request fails", async () => {
    anonymous();
    server.use(http.get(`${API}/v1/config`, () => HttpResponse.json(errorBody("internal_error", "x"), { status: 500 })));
    renderRoutes(login, "/login");
    expect(FALLBACK_APP_NAME).toBe("Super Mercado");
    expect(await screen.findByText("Super Mercado")).toBeInTheDocument();
    expect(screen.getByText(/O Super Mercado lê os produtos/)).toBeInTheDocument();
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
