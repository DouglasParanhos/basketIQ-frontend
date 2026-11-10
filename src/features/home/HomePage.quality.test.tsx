import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { overviewEmpty, overviewFewData, overviewGreen, overviewNoGoal, overviewNoTrend, overviewOrange, overviewOver, overviewRed, overviewZeroMonth } from "../../test/fixtures";
import { renderRoutes } from "../../test/render";
import { banned } from "../../test/banned";
import { API, serveOverview, server } from "../../test/server";
import { HomeRoute } from "./HomeRoute";

const routes = [{ path: "/", element: <HomeRoute /> }];
const BRAZILIAN = /Chegando lá|Aguardando|Sua meta|Definir minha meta/;
const FORBIDDEN = banned("saldo negativo|excedeu|perdeu");

describe("Início: quality (spec 011, US5)", () => {
  it("F-187: one single request per month shown, and none to the Resumo", async () => {
    const hits: string[] = [];
    server.use(
      http.get(`${API}/v1/analytics/summary`, () => {
        hits.push("summary");
        return HttpResponse.json({});
      }),
      http.get(`${API}/v1/analytics/consumption`, () => {
        hits.push("consumption");
        return HttpResponse.json({});
      }),
    );
    const months = serveOverview(overviewGreen);
    renderRoutes(routes, "/");
    await screen.findByRole("img", { name: /anel verde/i });
    await userEvent.setup().click(screen.getByRole("button", { name: "Mês anterior" }));
    await screen.findByText(/de 20\d\d$/);
    expect(months).toHaveLength(2);
    expect(hits).toEqual([]);
  });

  it("F-187: no forbidden word, in any state", async () => {
    for (const overview of [overviewGreen, overviewOrange, overviewRed, overviewOver, overviewNoGoal, overviewFewData, overviewNoTrend, overviewZeroMonth, overviewEmpty]) {
      serveOverview(overview);
      const view = renderRoutes(routes, "/");
      await screen.findByRole("heading", { level: 1, name: "Início" });
      await screen.findByText(/Este mês/);
      const text = document.body.textContent!;
      expect(text).not.toMatch(FORBIDDEN);
      expect(text).not.toMatch(BRAZILIAN);
      view.unmount();
    }
  });

  it("F-187: the Início keeps nothing in localStorage or sessionStorage", async () => {
    serveOverview(overviewGreen);
    renderRoutes(routes, "/");
    await screen.findByRole("img", { name: /anel verde/i });
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});
