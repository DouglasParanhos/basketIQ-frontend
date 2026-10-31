import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { currentMonth, shiftMonth } from "../../lib/month";
import { overviewEmpty, overviewFewData, overviewGreen, overviewNoGoal, overviewZeroMonth } from "../../test/fixtures";
import { renderRoutes } from "../../test/render";
import { serveOverview } from "../../test/server";
import { HomeRoute } from "./HomeRoute";

const routes = [
  { path: "/", element: <HomeRoute /> },
  { path: "/adicionar", element: <p>adicionar</p> },
  { path: "/compras", element: <p>compras</p> },
];
const plain = (s: string | null) => (s ?? "").replace(/\u00a0/g, " ");
const body = () => plain(document.body.textContent);
const home = (url = "/") => renderRoutes(routes, url);

describe("Início: states and composition (spec 011, US3)", () => {
  it("F-185: with data it has the title and the cards in the order of the design", async () => {
    serveOverview(overviewGreen);
    home();
    expect(await screen.findByRole("heading", { level: 1, name: "Início" })).toBeInTheDocument();
    await screen.findByRole("img", { name: "Anel verde, 38 % da meta usada" });
    const names = screen.getAllByRole("region").map((r) => r.getAttribute("aria-label") ?? within(r).getByRole("heading").textContent);
    expect(names).toEqual(["Meta pessoal do mês", "Média mensal", "Compras no mês", "Gasto por semana", "Onde gasta mais", "Últimas compras"]);
  });

  it("F-185: an account with no confirmed purchase sees the final layout as dashed cards, with what each one unlocks", async () => {
    serveOverview(overviewEmpty);
    home();
    expect(await screen.findByRole("heading", { level: 1, name: "Início" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "A aguardar o seu primeiro talão" })).toBeInTheDocument();
    expect(body()).toContain("Quanto mais talões registar, mais aprendemos sobre as suas compras.");
    expect(screen.getByRole("link", { name: "Adicionar talão" })).toHaveAttribute("href", "/adicionar");
    expect(body()).toContain("Aparece com 2 meses de histórico");
    expect(body()).toContain("A aguardar dados");
    // The dashed cards are not values: the ghost figures are hidden from assistive technology.
    expect(screen.queryByRole("img", { name: /anel/i })).not.toBeInTheDocument();
    expect(body()).not.toMatch(/(?<![\d.])0,00 €/); // no zero amount (400,00 € is the goal)
  });

  it("F-185: with few months of history each card says what it lacks", async () => {
    serveOverview(overviewFewData);
    home();
    await screen.findByRole("img", { name: "Anel verde, 38 % da meta usada" });
    expect(body()).toContain("— €");
    expect(body()).toContain("Aparece com 2 meses de histórico");
    expect(body()).toContain("0/2 meses");
  });

  it("F-185: a month without purchases in an account that has some shows zeros and the ring with the goal, not the empty state", async () => {
    serveOverview(overviewZeroMonth);
    home();
    await screen.findByRole("img", { name: "Anel verde, 0 % da meta usada" });
    expect(body()).toContain("0,00 €");
    expect(body()).not.toContain("A aguardar o seu primeiro talão");
  });

  it("F-185: while loading only the indicator shows: no values and no zeros", async () => {
    serveOverview(overviewGreen, { delayMs: 150 });
    home();
    expect(await screen.findByRole("status")).toHaveTextContent("A carregar…");
    expect(body()).not.toMatch(/\d,\d\d €/);
    await screen.findByRole("img", { name: /anel verde/i });
  });

  it("F-185: when it fails it says so with «Tentar de novo», shows no old values, and asking again reads again", async () => {
    const months = serveOverview("error");
    home();
    expect(await screen.findByText("Não foi possível carregar o Início.")).toBeInTheDocument();
    expect(body()).not.toMatch(/\d,\d\d €/);
    serveOverview(overviewGreen);
    await userEvent.setup().click(screen.getByRole("button", { name: "Tentar de novo" }));
    await screen.findByRole("img", { name: "Anel verde, 38 % da meta usada" });
    expect(months.length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Não foi possível carregar o Início.")).not.toBeInTheDocument();
  });

  it("F-185: an account from before the onboarding, with no goal, can define it from the Início", async () => {
    serveOverview(overviewNoGoal);
    home();
    expect(await screen.findByRole("link", { name: "Definir a minha meta pessoal" })).toHaveAttribute("href", "/definicoes/perfil?editar=meta");
  });
});

describe("Início: navigating between months (spec 011, US6)", () => {
  it("F-188: without «mes» it asks for the current month, once, and says «Este mês»", async () => {
    const months = serveOverview(overviewGreen);
    home();
    await screen.findByText("Este mês");
    expect(months).toEqual([currentMonth()]);
  });

  it("F-188: «Mês anterior» changes the URL and asks for that month; Back returns", async () => {
    const months = serveOverview((month) => ({ ...overviewGreen, month }));
    const { router } = home();
    const user = userEvent.setup();
    await screen.findByText("Este mês");
    await user.click(screen.getByRole("button", { name: "Mês anterior" }));
    const previous = shiftMonth(currentMonth(), -1);
    await waitFor(() => expect(router.state.location.search).toBe(`?mes=${previous}`));
    await waitFor(() => expect(months).toContain(previous));
    expect(screen.getByRole("button", { name: "Mês seguinte" })).toBeEnabled();
    await router.navigate(-1);
    await waitFor(() => expect(router.state.location.search).toBe(""));
    expect(await screen.findByText("Este mês")).toBeInTheDocument();
  });

  it("F-188: a past month says «Meta atual» and «Mês anterior» in the purchases", async () => {
    const previous = shiftMonth(currentMonth(), -1);
    serveOverview((month) => ({ ...overviewGreen, month }));
    home(`/?mes=${previous}`);
    expect(await screen.findByText("Meta atual")).toBeInTheDocument();
    expect(body()).toContain("Mês anterior: 11");
  });

  it("F-188: an invalid month in the URL shows the current month", async () => {
    const months = serveOverview(overviewGreen);
    home("/?mes=lixo");
    await screen.findByText("Este mês");
    expect(months).toEqual([currentMonth()]);
  });

  it("F-188: a future month typed by hand is asked for and shows what comes back", async () => {
    const months = serveOverview((month) => ({ ...overviewZeroMonth, month }));
    home("/?mes=2999-01");
    await screen.findByRole("img", { name: /0 % da meta atual usada/ });
    expect(months).toEqual(["2999-01"]);
  });

  it("F-188: the buttons of the months have names and the label is announced", async () => {
    serveOverview(overviewGreen);
    home();
    await screen.findByText("Este mês");
    expect(screen.getByRole("button", { name: "Mês anterior" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mês seguinte" })).toBeDisabled();
    expect(screen.getByText("Este mês").closest("[aria-live]")).toHaveAttribute("aria-live", "polite");
  });
});
