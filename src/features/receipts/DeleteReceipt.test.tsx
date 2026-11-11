import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { formatCents, formatDate } from "../../lib/format";
import { receipt } from "../../test/fixtures";
import { renderRoutes } from "../../test/render";
import { API, server } from "../../test/server";
import { ReceiptPage } from "./ReceiptPage";

// Spec 021: eliminating a purchase. A reading that failed is dropped with one question; a confirmed purchase takes more layers.
const routes = [
  { path: "/compras/:id", element: <ReceiptPage /> },
  { path: "/compras", element: <p>lista</p> },
];

const illegible = { code: "illegible", message: "Não conseguimos ler bem os produtos deste talão.", field: null, line_index: null, details: {} };
const confirmed = () => receipt({ status: "CONFIRMED", review_reasons: [], confirmed_by: "USER", confirmed_at: "2026-09-15T13:00:00Z" });

function serveDelete(counter: { calls: number }) {
  server.use(
    http.delete(`${API}/v1/receipts/r1`, () => {
      counter.calls += 1;
      return new HttpResponse(null, { status: 204 });
    }),
  );
}

describe("«Eliminar talão» when the reading failed (spec 021, US1)", () => {
  it("F-350: a photo read badly can also be eliminated: one question, «Cancelar» keeps it, the button deletes and goes to the list", async () => {
    const deleted = { calls: 0 };
    serveDelete(deleted);
    server.use(http.get(`${API}/v1/receipts/r1`, () => HttpResponse.json(receipt({ review_reasons: [illegible] }))));
    const user = userEvent.setup();
    renderRoutes(routes, "/compras/r1");

    expect(await screen.findByText("Não conseguimos ler bem este talão")).toBeInTheDocument();
    const eliminate = screen.getByRole("button", { name: "Eliminar talão" });
    await user.click(eliminate);
    const question = screen.getByText("Eliminar esta compra?").closest("[role=status]") as HTMLElement;

    await user.click(within(question).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByText("Eliminar esta compra?")).toBeNull();
    expect(eliminate).toHaveFocus();
    expect(deleted.calls).toBe(0);

    await user.click(eliminate);
    const again = screen.getByText("Eliminar esta compra?").closest("[role=status]") as HTMLElement;
    await user.click(within(again).getByRole("button", { name: "Eliminar compra" }));
    expect(await screen.findByText("lista")).toBeInTheDocument();
    expect(deleted.calls).toBe(1);
  });

  it("F-350: «Tirar outra foto» and «Corrigir à mão» are still there", async () => {
    server.use(http.get(`${API}/v1/receipts/r1`, () => HttpResponse.json(receipt({ review_reasons: [illegible] }))));
    renderRoutes(routes, "/compras/r1");
    expect(await screen.findByRole("button", { name: "Tirar outra foto" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Corrigir à mão" })).toBeInTheDocument();
  });
});

describe("«Eliminar compra» on a confirmed purchase (spec 021, US2)", () => {
  async function openQuestion() {
    server.use(http.get(`${API}/v1/receipts/r1`, () => HttpResponse.json(confirmed())));
    const user = userEvent.setup();
    renderRoutes(routes, "/compras/r1");
    await user.click(await screen.findByRole("button", { name: "Eliminar compra" }));
    const question = screen.getByText("Eliminar esta compra confirmada?").closest("[role=status]") as HTMLElement;
    return { user, question };
  }

  it("F-351: the question says what is lost, in numbers, and what to do instead", async () => {
    const { question } = await openQuestion();
    const r = confirmed();
    expect(within(question).getByText(new RegExp(`Pingo Doce.*${formatDate(r.purchase_at)}`))).toBeInTheDocument();
    // The query normalises white space, so the amount (written with a no-break space) is matched with any space.
    const total = formatCents(293).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s/g, "\\s");
    expect(within(question).getByText(new RegExp(`2 produtos.*${total}`))).toBeInTheDocument();
    expect(within(question).getByText(/deixa de contar no Resumo, em Produtos e na meta do mês/i)).toBeInTheDocument();
    expect(within(question).getByText(/Não é possível desfazer/)).toBeInTheDocument();
    expect(within(question).getByText(/«Editar talão»/)).toBeInTheDocument(); // the safer way to fix a value
    expect(within(question).getByText(/«Apagar só o ficheiro»/)).toBeInTheDocument(); // the safer way to drop the image
  });

  it("F-352: the final button stays off until the box «Compreendo…» is ticked, and nothing is deleted before", async () => {
    const deleted = { calls: 0 };
    serveDelete(deleted);
    const { user, question } = await openQuestion();
    const final = within(question).getByRole("button", { name: "Eliminar compra" });
    expect(final).toBeDisabled();

    await user.click(final); // a disabled button does nothing
    expect(deleted.calls).toBe(0);

    const box = within(question).getByRole("checkbox", { name: /Compreendo que esta compra e o ficheiro serão apagados/ });
    await user.click(box);
    expect(final).toBeEnabled();
    await user.click(box); // untick: off again
    expect(final).toBeDisabled();
  });

  it("F-353: with the box ticked the button deletes and goes to the list", async () => {
    const deleted = { calls: 0 };
    serveDelete(deleted);
    const { user, question } = await openQuestion();
    await user.click(within(question).getByRole("checkbox"));
    await user.click(within(question).getByRole("button", { name: "Eliminar compra" }));
    expect(await screen.findByText("lista")).toBeInTheDocument();
    expect(deleted.calls).toBe(1);
  });

  it("F-354: «Cancelar» closes the question, deletes nothing and gives the focus back to «Eliminar compra»", async () => {
    const deleted = { calls: 0 };
    serveDelete(deleted);
    const { user, question } = await openQuestion();
    await user.click(within(question).getByRole("checkbox"));
    await user.click(within(question).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByText("Eliminar esta compra confirmada?")).toBeNull();
    expect(screen.getByRole("button", { name: "Eliminar compra" })).toHaveFocus();
    expect(deleted.calls).toBe(0);

    // Opened again, the box starts unticked: the layers are not skipped by an earlier tick.
    await user.click(screen.getByRole("button", { name: "Eliminar compra" }));
    const next = screen.getByText("Eliminar esta compra confirmada?").closest("[role=status]") as HTMLElement;
    expect(within(next).getByRole("checkbox")).not.toBeChecked();
    expect(within(next).getByRole("button", { name: "Eliminar compra" })).toBeDisabled();
  });

  it("F-355: a failed deletion shows the error and keeps the question open", async () => {
    server.use(http.delete(`${API}/v1/receipts/r1`, () => HttpResponse.json({ code: "internal_error", message: "Não foi possível eliminar a compra." }, { status: 500 })));
    const { user, question } = await openQuestion();
    await user.click(within(question).getByRole("checkbox"));
    await user.click(within(question).getByRole("button", { name: "Eliminar compra" }));
    expect(await screen.findByText(/Não foi possível eliminar a compra/)).toBeInTheDocument();
    expect(screen.queryByText("lista")).toBeNull();
  });
});

describe("the review and the failed reading keep the single question (spec 021, US3)", () => {
  it("F-356: a purchase still in review is eliminated with the one question, no box", async () => {
    const deleted = { calls: 0 };
    serveDelete(deleted);
    const user = userEvent.setup();
    renderRoutes(routes, "/compras/r1"); // default handler: a receipt in review
    await user.click(await screen.findByRole("button", { name: "Eliminar talão" }));
    const question = screen.getByText("Eliminar esta compra?").closest("[role=status]") as HTMLElement;
    expect(within(question).queryByRole("checkbox")).toBeNull();
    await user.click(within(question).getByRole("button", { name: "Eliminar compra" }));
    expect(await screen.findByText("lista")).toBeInTheDocument();
    expect(deleted.calls).toBe(1);
  });
});
