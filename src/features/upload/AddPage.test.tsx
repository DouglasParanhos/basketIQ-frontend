import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { merchants } from "../../test/fixtures";
import { renderRoutes } from "../../test/render";
import { API, server } from "../../test/server";
import { pdf, serveUpload } from "../../test/upload";
import { AddPage } from "./AddPage";

const routes = [
  { path: "/adicionar", element: <AddPage /> },
  { path: "/compras/:id", element: <p>detalhe da compra</p> },
];

function pick(testId: string, file: File) {
  return userEvent.upload(screen.getByTestId(testId) as HTMLInputElement, file, { applyAccept: false });
}

describe("Adicionar: the first screen (spec 013, US1)", () => {
  it("F-200: has the title, the subtitle, the three big buttons in order and the long-receipt warning", async () => {
    renderRoutes(routes, "/adicionar");
    expect(screen.getByRole("heading", { level: 1, name: "Adicionar talão" })).toBeInTheDocument();
    expect(screen.getByText("Lemos o talão e confirma os valores.")).toBeInTheDocument();
    const names = screen.getAllByRole("button").map((b) => b.textContent ?? "");
    const order = ["Fotografar", "Escolher imagem", "Escolher PDF"].map((n) => names.findIndex((t) => t.includes(n)));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(screen.getByText(/Talão comprido\?/)).toBeInTheDocument();
    expect(screen.getByText(/Tire mais de uma foto, uma parte de cada vez\. Juntamos tudo num só talão\./)).toBeInTheDocument();
  });

  it("F-200: the merchants come from the API, with «Detetar sozinho» first and chosen", async () => {
    server.use(http.get(`${API}/v1/merchants`, () => HttpResponse.json([...merchants, { id: "INTERMARCHE", name: "Intermarché" }])));
    renderRoutes(routes, "/adicionar");
    const group = await screen.findByRole("radiogroup", { name: "Supermercado (opcional)" });
    expect(await within(group).findByRole("radio", { name: "Intermarché" })).toBeInTheDocument();
    const radios = within(group).getAllByRole("radio");
    expect(radios[0]).toHaveAccessibleName("Detetar sozinho");
    expect(radios[0]).toBeChecked();
    expect(radios).toHaveLength(9);
    expect(within(group).getByRole("radio", { name: "Auchan" })).toBeInTheDocument();
    expect(within(group).getByRole("radio", { name: "Aldi" })).toBeInTheDocument();
  });

  it("F-200: the chosen merchant is sent as the hint", async () => {
    const { bodies } = serveUpload("r30");
    const user = userEvent.setup();
    renderRoutes(routes, "/adicionar");
    await user.click(await screen.findByRole("radio", { name: "Lidl" }));
    await pick("input-pdf", pdf("fatura.pdf"));
    await user.click(await screen.findByRole("button", { name: /^enviar talão$/i }));
    expect(await screen.findByText("detalhe da compra")).toBeInTheDocument();
    expect(bodies["init:fatura.pdf"]!.merchant_hint).toBe("LIDL");
  });

  it("F-200: when the merchants fail only «Detetar sozinho» is offered, with a note, and the upload still works", async () => {
    server.use(http.get(`${API}/v1/merchants`, () => HttpResponse.json({ code: "x", message: "x" }, { status: 500 })));
    const { bodies, calls } = serveUpload("r31");
    const user = userEvent.setup();
    renderRoutes(routes, "/adicionar");
    expect(await screen.findByText("Não foi possível carregar os supermercados. Pode enviar na mesma.")).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(1);
    await pick("input-pdf", pdf("fatura.pdf"));
    await user.click(await screen.findByRole("button", { name: /^enviar talão$/i }));
    expect(await screen.findByText("detalhe da compra")).toBeInTheDocument();
    expect(bodies["init:fatura.pdf"]!.merchant_hint).toBeNull();
    expect(calls).toEqual(["init:fatura.pdf", "storage:p0", "process"]);
  });

  it("F-200: an unsupported file is refused with an alert, and the screen does not change", async () => {
    renderRoutes(routes, "/adicionar");
    await pick("input-pdf", new File(["MZ"], "virus.exe", { type: "application/x-msdownload" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/não é suportado/i);
    expect(screen.getByRole("heading", { level: 1, name: "Adicionar talão" })).toBeInTheDocument();
  });

  it("F-200: the photo inputs are kept for the camera, the gallery and the PDF", () => {
    renderRoutes(routes, "/adicionar");
    expect(screen.getByTestId("input-camera")).toHaveAttribute("capture", "environment");
    expect(screen.getByTestId("input-image")).not.toHaveAttribute("capture");
    expect(screen.getByTestId("input-pdf")).toHaveAttribute("accept", expect.stringContaining("pdf"));
  });
});
