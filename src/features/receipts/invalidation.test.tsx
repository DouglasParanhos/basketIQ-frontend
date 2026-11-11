import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { receipt } from "../../test/fixtures";
import { renderRoutes } from "../../test/render";
import { API, server } from "../../test/server";
import { pdf, serveUpload } from "../../test/upload";
import { AddPage } from "../upload/AddPage";
import { ReceiptPage } from "./ReceiptPage";

// Home, Talões and the lists must not show old values as current after a purchase changes (constituição III). Deleting only the original does not change totals and is left out.
const detail = [
  { path: "/compras/:id", element: <ReceiptPage /> },
  { path: "/compras", element: <p>lista</p> },
];

describe("the cache of the Início and of the totals by month after a purchase changes (specs 011 and 012)", () => {
  it("F-185: deleting the purchase invalidates the overview and the totals by month", async () => {
    server.use(
      http.get(`${API}/v1/receipts/r1`, () => HttpResponse.json(receipt({ status: "CONFIRMED", review_reasons: [] }))),
      http.delete(`${API}/v1/receipts/r1`, () => new HttpResponse(null, { status: 204 })),
    );
    const { client } = renderRoutes(detail, "/compras/r1");
    const spy = vi.spyOn(client, "invalidateQueries");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Eliminar compra" }));
    const confirm = screen.getByText("Eliminar esta compra confirmada?").closest("[role=status]") as HTMLElement;
    await user.click(within(confirm).getByRole("checkbox")); // a confirmed purchase takes the box too (spec 021)
    await user.click(within(confirm).getByRole("button", { name: "Eliminar compra" }));
    expect(await screen.findByText("lista")).toBeInTheDocument();
    expect(spy).toHaveBeenCalledWith({ queryKey: ["overview"] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["months"] });
  });

  it("F-185: deciding a duplicate invalidates the overview and the totals by month", async () => {
    server.use(
      http.get(`${API}/v1/receipts/r1`, () => HttpResponse.json(receipt({ duplicate_of_receipt_id: "r0", duplicate_acknowledged: false }))),
      http.post(`${API}/v1/receipts/r1/duplicate-decision`, () => HttpResponse.json(receipt())),
    );
    const { client } = renderRoutes(detail, "/compras/r1");
    const spy = vi.spyOn(client, "invalidateQueries");
    await userEvent.setup().click(await screen.findByRole("button", { name: "Manter as duas" }));
    await vi.waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ["overview"] }));
    expect(spy).toHaveBeenCalledWith({ queryKey: ["months"] });
  });

  it("F-185: editing and confirming invalidates the overview and the totals by month", async () => {
    server.use(http.post(`${API}/v1/receipts/r1/confirm`, () => HttpResponse.json(receipt({ status: "CONFIRMED", confirmed_by: "USER", confirmed_at: "2026-09-15T13:00:00Z" }))));
    const { client } = renderRoutes(detail, "/compras/r1");
    const spy = vi.spyOn(client, "invalidateQueries");
    await userEvent.setup().click(await screen.findByRole("button", { name: /^confirmar talão$/i }));
    await vi.waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ["overview"] }));
    expect(spy).toHaveBeenCalledWith({ queryKey: ["months"] });
  });

  it("F-185: finishing an upload invalidates the overview, because the latest purchases include the ones being read", async () => {
    serveUpload("r60");
    const { client } = renderRoutes(
      [
        { path: "/adicionar", element: <AddPage /> },
        { path: "/compras/:id", element: <p>detalhe da compra</p> },
      ],
      "/adicionar",
    );
    const spy = vi.spyOn(client, "invalidateQueries");
    const user = userEvent.setup();
    await userEvent.upload(screen.getByTestId("input-pdf") as HTMLInputElement, pdf("fatura.pdf"), { applyAccept: false });
    await user.click(await screen.findByRole("button", { name: /^enviar talão$/i }));
    expect(await screen.findByText("detalhe da compra")).toBeInTheDocument();
    expect(spy).toHaveBeenCalledWith({ queryKey: ["overview"] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["months"] });
  });
});
