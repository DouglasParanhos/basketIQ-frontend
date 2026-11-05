import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { renderRoutes } from "../../test/render";
import { API, errorBody, server } from "../../test/server";
import { jpg, serveUpload, stubPreviewUrls } from "../../test/upload";
import { AddPage } from "./AddPage";

vi.mock("./QuadEditor", async () => ({ QuadEditor: (await import("../../test/upload")).FakeQuadEditor }));
vi.mock("./renderEdit", () => ({ renderEdit: vi.fn(async () => new Blob(["x"])) }));

stubPreviewUrls();

const BANNED = /você|a gente|enviar nota|mais barato|captura automática|talão detetado/i;
const routes = [
  { path: "/adicionar", element: <AddPage /> },
  { path: "/compras/:id", element: <p>detalhe da compra</p> },
];
const pick = (testId: string, file: File) => userEvent.upload(screen.getByTestId(testId) as HTMLInputElement, file, { applyAccept: false });

async function openParts(...names: string[]) {
  renderRoutes(routes, "/adicionar");
  for (const name of names) await pick("input-image", jpg(name));
  await screen.findByRole("heading", { level: 1, name: "Confirme as partes" });
  await screen.findByText(names.at(-1)!);
  return userEvent.setup();
}

describe("Adicionar quality (spec 013, US6)", () => {
  it("F-205: no banned word on the first screen, the parts, the editor and the discard question", async () => {
    renderRoutes(routes, "/adicionar");
    await screen.findByRole("radio", { name: "Lidl" });
    expect(document.body.textContent).not.toMatch(BANNED);
    document.body.innerHTML = "";

    const user = await openParts("a.jpg", "b.jpg");
    expect(document.body.textContent).not.toMatch(BANNED);
    await user.click(screen.getByRole("button", { name: "Recortar a parte 1" }));
    expect(document.body.textContent).not.toMatch(BANNED);
    await user.click(screen.getByRole("button", { name: "Concluir" }));
    await user.click(screen.getByRole("button", { name: "Voltar" }));
    expect(document.body.textContent).not.toMatch(BANNED);
  });

  it("F-205: the merchants and the parts use text and initials, not images", async () => {
    renderRoutes(routes, "/adicionar");
    await screen.findByRole("radio", { name: "Lidl" });
    expect(screen.queryAllByRole("img")).toHaveLength(0);
    await pick("input-image", jpg("a.jpg"));
    await screen.findByText("a.jpg");
    expect(screen.queryAllByRole("img")).toHaveLength(0); // the preview is decorative: the part has its name
  });

  it("F-205: the arrow keys move between the merchant chips", async () => {
    renderRoutes(routes, "/adicionar");
    const user = userEvent.setup();
    const auto = await screen.findByRole("radio", { name: "Detetar sozinho" });
    await screen.findByRole("radio", { name: "Continente" });
    auto.focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: "Continente" })).toBeChecked();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: "Pingo Doce" })).toBeChecked();
  });

  it("F-205: Tab follows the visual order on the parts screen", async () => {
    const user = await openParts("a.jpg", "b.jpg");
    (await screen.findByRole("heading", { level: 1, name: "Confirme as partes" })).focus();
    const order: string[] = [];
    for (let i = 0; i < 12; i++) {
      await user.tab();
      const el = document.activeElement as HTMLElement;
      order.push(el.getAttribute("aria-label") ?? (el as HTMLSelectElement).labels?.[0]?.textContent ?? el.textContent ?? "");
    }
    const names = order.map((n) => n.trim());
    const at = (name: string | RegExp) => names.findIndex((n) => (typeof name === "string" ? n === name : name.test(n)));
    const expected: (string | RegExp)[] = [
      "Recortar a parte 1",
      "Apagar a parte 1",
      "Descer a parte 1",
      "Recortar a parte 2",
      "Apagar a parte 2",
      "Subir a parte 2",
      /Adicionar outra parte/,
      /Escolher da galeria/,
      /Supermercado/,
      /Enviar talão · 2 fotos/,
      /Cancelar/,
    ];
    const positions = expected.map(at);
    expect(positions.every((p) => p >= 0), names.join(" | ")).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it("F-205: the progress, the duplicate and the failure are announced", async () => {
    let open!: () => void;
    const gate = new Promise<void>((resolve) => (open = resolve));
    serveUpload("r50");
    server.use(
      http.post("http://storage.test/:name", async () => {
        await gate;
        return new HttpResponse(null, { status: 204 });
      }),
      http.post(`${API}/v1/receipts/r50/process`, () => HttpResponse.json(errorBody("boom", "Falhou."), { status: 500 })),
    );
    const user = await openParts("a.jpg", "b.jpg");
    await user.click(screen.getByRole("button", { name: "Enviar talão · 2 fotos" }));
    expect(await screen.findByRole("progressbar", { name: "Progresso do envio" })).toBeInTheDocument();
    open();
    expect(await screen.findByRole("alert")).toHaveTextContent(/o envio não terminou/i);
  });

  it("F-205: the photos and the choices are kept only in memory", async () => {
    await openParts("a.jpg");
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});
