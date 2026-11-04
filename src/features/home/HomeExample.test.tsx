import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { overviewEmpty, overviewGreen, profile } from "../../test/fixtures";
import { renderRoutes } from "../../test/render";
import { serveOverview, serveProfile, server } from "../../test/server";
import { HomeRoute } from "./HomeRoute";

const routes = [
  { path: "/", element: <HomeRoute /> },
  { path: "/adicionar", element: <p>adicionar</p> },
  { path: "/compras", element: <p>compras</p> },
];
const home = (url = "/") => renderRoutes(routes, url);
const plain = (s: string | null) => (s ?? "").replaceAll(String.fromCharCode(160), " ");

/** Every request the page makes, as «GET /v1/...», to prove what the example does not ask for. */
function watchRequests() {
  const seen: string[] = [];
  const listener = ({ request }: { request: Request }) => void seen.push(`${request.method} ${new URL(request.url).pathname}`);
  server.events.on("request:start", listener);
  return { seen, stop: () => server.events.removeListener("request:start", listener) };
}

let watcher: ReturnType<typeof watchRequests> | null = null;
afterEach(() => watcher?.stop());

describe("Início com dados de exemplo (invented figures, only in the client)", () => {
  it("asks the API for nothing and writes nothing: no request of any kind, from opening it to leaving it", async () => {
    watcher = watchRequests();
    const user = userEvent.setup();
    const { router } = home("/?exemplo=1");
    await screen.findByRole("heading", { level: 1, name: "Início, com dados de exemplo" });
    expect(watcher.seen).toEqual([]);
    // Nothing in the example is a button that saves: the only controls are the way out and the tiles are not links.
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    serveOverview(overviewGreen);
    await user.click(screen.getByRole("link", { name: "Sair do exemplo" }));
    await waitFor(() => expect(router.state.location.search).toBe(""));
    await screen.findByRole("img", { name: /Anel verde/ });
    // The real Início does ask (so the watcher does see requests), and still writes nothing.
    expect(watcher.seen).toContain("GET /v1/analytics/overview");
    expect(watcher.seen.filter((request) => !request.startsWith("GET "))).toEqual([]);
  });

  it("says it is an example, with a way out that is a 44 px link to the real Início", async () => {
    home("/?exemplo=1");
    expect(await screen.findByText("Dados de exemplo · loja fictícia")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sair do exemplo" })).toHaveAttribute("href", "/");
  });

  it("shows the cards of the design with Continente and Auchan side by side, and a price change that the real Início does not have", async () => {
    home("/?exemplo=1");
    await screen.findByRole("img", { name: "Anel dourado, 62 % da meta usada" });
    const regions = screen.getAllByRole("region").map((r) => r.getAttribute("aria-label") ?? within(r).getByRole("heading").textContent);
    expect(regions).toEqual(["Meta pessoal do mês", "Média mensal", "Compras no mês", "Por pessoa no mês", "Gasto por semana", "Onde gasta mais", "O que mudou de preço", "Últimas compras"]);
    const stores = within(screen.getByRole("region", { name: "Onde gasta mais" }));
    expect(stores.getByText("Continente")).toBeInTheDocument();
    expect(stores.getByText("Auchan")).toBeInTheDocument();
    expect(plain(screen.getByRole("region", { name: "Por pessoa no mês" }).textContent)).toContain("124,00 €");
  });

  it("the latest purchases of the example are not links: those receipts do not exist, and «Ver todas» is not offered", async () => {
    home("/?exemplo=1");
    const recent = await screen.findByRole("region", { name: "Últimas compras" });
    expect(within(recent).queryAllByRole("link")).toHaveLength(0);
    expect(within(recent).getAllByRole("listitem")).toHaveLength(3);
  });
});

describe("Início: «Por pessoa no mês» and the price changes with a real account", () => {
  it("divides the month's spending by the people of the house, as written in the profile", async () => {
    serveOverview(overviewGreen); // 152,00 € and 2 people in the profile
    home();
    const card = await screen.findByRole("region", { name: "Por pessoa no mês" });
    expect(card).toHaveTextContent("2 pessoas em casa");
    expect(plain(card.textContent)).toContain("76,00 €");
  });

  it("is not shown without the people of the house: there is nothing to divide by", async () => {
    serveOverview(overviewGreen);
    serveProfile({ ...profile, household_size: null });
    home();
    await screen.findByRole("img", { name: /Anel verde/ });
    expect(screen.queryByRole("region", { name: "Por pessoa no mês" })).toBeNull();
  });

  it("«O que mudou de preço» is not shown: the API has no such figure, and none is invented", async () => {
    serveOverview(overviewGreen);
    home();
    await screen.findByRole("img", { name: /Anel verde/ });
    expect(screen.queryByText("O que mudou de preço")).toBeNull();
  });
});

describe("Início sem talões: a translucent sheet over the ghost", () => {
  it("offers the first receipt and the example, and the ghost under the sheet cannot be reached", async () => {
    serveOverview(overviewEmpty);
    home();
    const sheet = await screen.findByRole("region", { name: "A aguardar o seu primeiro talão" });
    expect(within(sheet).getByRole("link", { name: "Adicionar o meu primeiro talão" })).toHaveAttribute("href", "/adicionar");
    expect(within(sheet).getByRole("link", { name: "Ver com dados de exemplo" })).toHaveAttribute("href", "/?exemplo=1");
    // The month buttons and the dashed cards are inert (no focus, no pointer): only the sheet and the navigation bar are left.
    expect(screen.getByText("Este mês").closest("[inert]")).not.toBeNull();
    expect(screen.getByRole("region", { name: "Média mensal", hidden: true }).closest("[inert]")).not.toBeNull();
    expect(sheet.closest("[inert]")).toBeNull();
  });

  it("«Ver com dados de exemplo» opens the example, with its banner", async () => {
    serveOverview(overviewEmpty);
    const { router } = home();
    await userEvent.setup().click(await screen.findByRole("link", { name: "Ver com dados de exemplo" }));
    await waitFor(() => expect(router.state.location.search).toBe("?exemplo=1"));
    expect(await screen.findByText("Dados de exemplo · loja fictícia")).toBeInTheDocument();
  });
});
