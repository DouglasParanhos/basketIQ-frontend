import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { line, receipt } from "../../test/fixtures";
import { renderRoutes } from "../../test/render";
import { API, server } from "../../test/server";
import { ReceiptPage } from "./ReceiptPage";

const open = () =>
  renderRoutes(
    [
      { path: "/compras/:id", element: <ReceiptPage /> },
      { path: "/compras", element: <p>lista</p> },
    ],
    "/compras/r1",
  );

const serve = (overrides: Parameters<typeof receipt>[0]) => server.use(http.get(`${API}/v1/receipts/r1`, () => HttpResponse.json(receipt(overrides))));
const plain = (s: string | null | undefined) => (s ?? "").replace(/\s/g, " ");
const pencil = (name: RegExp) => screen.findByRole("button", { name });

/** `n` lines that nothing asks attention for. */
const calm = (n: number) => Array.from({ length: n }, (_, i) => line({ id: `c${i + 1}`, line_number: i + 1, raw_description: `PRODUTO ${i + 1}`, product: null, line_total_cents: 100, net_cents: 100 }));

afterEach(() => vi.restoreAllMocks());

describe("Rever talão: the header, the warning and the summary card", () => {
  it("the title is «Rever talão» and the store and the date are in the summary card, with no status badge in the header", async () => {
    open();
    expect(await screen.findByRole("heading", { level: 1, name: "Rever talão" })).toBeInTheDocument();
    expect(screen.queryByText("Revisão necessária")).toBeNull();
    const card = screen.getByRole("region", { name: "Resumo da compra" });
    expect(within(card).getByLabelText("Mercado")).toHaveValue("PINGO_DOCE");
    expect(plain(card.textContent)).toContain("15 set. 2026, 12:30");
    expect(plain(card.textContent)).toContain("2,93 €");
  });

  it("a confirmed purchase keeps the title with its store", async () => {
    serve({ status: "CONFIRMED", review_reasons: [] });
    open();
    expect(await screen.findByRole("heading", { level: 1, name: "Pingo Doce" })).toBeInTheDocument();
  });

  it("says in one sentence how many values were read with little confidence", async () => {
    open();
    expect(await screen.findByText("Há 2 valores que lemos com pouca confiança, marcados a amarelo.")).toBeInTheDocument();
  });

  it("says «1 valor … marcado» in the singular", async () => {
    serve({
      lines: [line(), line({ id: "l2", raw_description: "BANANA", product: null, flags: ["low_confidence:quantity"], review_status: "NEEDS_REVIEW" })],
    });
    open();
    expect(await screen.findByText(/^Há 1 valor que lemos com pouca confiança, marcado a amarelo\./)).toBeInTheDocument();
  });

  it("adds the sum against the total when they differ, and does not repeat the backend's text for it", async () => {
    serve({
      totals: { ...receipt().totals, printed_total_cents: 2275 },
      review_reasons: [{ code: "totals_mismatch", message: "A soma das linhas não coincide com o total da nota.", field: null, line_index: null, details: { difference_cents: -1982 } }],
      lines: [line()],
    });
    open();
    await screen.findByRole("heading", { level: 1, name: "Rever talão" });
    expect(plain(document.body.textContent)).toContain("A soma das linhas (1,70 €) não coincide com o total do talão (22,75 €).");
    expect(screen.queryByText("A soma das linhas não coincide com o total da nota.")).toBeNull();
  });

  it("keeps the other reasons as a list, in the backend's words, and opens the date when it is missing", async () => {
    serve({
      purchase_at: null,
      review_reasons: [{ code: "date_missing", message: "Indique a data da compra.", field: "purchase_at", line_index: null, details: {} }],
      lines: [line()],
    });
    open();
    expect(await screen.findByText("Indique a data da compra.")).toBeInTheDocument();
    expect(screen.getByLabelText("Data")).toBeInTheDocument(); // the fields of the date start open
    expect(screen.getByRole("button", { name: "Editar data e hora" })).toHaveAttribute("aria-expanded", "true");
  });

  it("a doubtful value of the header (the total, the date) keeps its reason, even when the lines have doubtful values too", async () => {
    serve({
      review_reasons: [
        { code: "low_confidence", message: "Valores lidos com pouca confiança.", field: "total", line_index: null, details: {} },
        { code: "low_confidence", message: "Valores lidos com pouca confiança.", field: null, line_index: 1, details: { fields: ["quantity"] } },
      ],
    });
    open();
    const warning = (await screen.findByText("Reveja antes de confirmar")).closest("[role=status]") as HTMLElement;
    expect(within(warning).getAllByRole("listitem")).toHaveLength(1); // the one of the header; the one of line 2 is in the sentence
  });

  it("the pencils open and close the date and the total", async () => {
    const user = userEvent.setup();
    open();
    const date = await screen.findByRole("button", { name: "Editar data e hora" });
    expect(date).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText("Hora")).toBeNull();
    await user.click(date);
    expect(screen.getByLabelText("Hora")).toBeInTheDocument();
    await user.click(date);
    expect(screen.queryByLabelText("Hora")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Editar total da nota" }));
    expect(screen.getByLabelText("Total da nota")).toHaveValue("2,93");
  });

  it("an unknown store asks for its name inside the card", async () => {
    const user = userEvent.setup();
    open();
    await user.selectOptions(await screen.findByLabelText("Mercado"), "UNKNOWN");
    expect(screen.getByLabelText("Nome da loja")).toBeInTheDocument();
  });
});

describe("Rever talão: the lines", () => {
  it("each line has the name, the quantity × the price, the total and a pencil; «Produtos · N» counts them", async () => {
    open();
    expect(await screen.findByRole("heading", { level: 2, name: "Produtos · 2" })).toBeInTheDocument();
    const row = screen.getByText("LEITE MEIO GORDO").closest("li")!;
    expect(plain(row.textContent)).toContain("2 × 0,85");
    expect(within(row).getByText("1,70")).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: "Editar LEITE MEIO GORDO" })).toBeInTheDocument();
  });

  it("the panel has the two figures, what was read, and «Guardar» keeps the edit", async () => {
    const user = userEvent.setup();
    open();
    await user.click(await pencil(/editar leite meio gordo/i));
    expect(screen.getByText("a editar")).toBeInTheDocument();
    expect(screen.getByLabelText("Quantidade")).toHaveValue("2");
    expect(screen.getByText("Lido: 1,70. Confira com o talão original.")).toBeInTheDocument();
    const total = screen.getByLabelText("Preço total (€)");
    await user.clear(total);
    await user.type(total, "1,90");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(screen.queryByText("a editar")).toBeNull();
    const row = screen.getByText("LEITE MEIO GORDO").closest("li")!;
    expect(within(row).getByText("1,90")).toBeInTheDocument();
    expect(within(row).getByText("Corrigido manualmente")).toBeInTheDocument();
  });

  it("«Cancelar» puts the line back, and leaving then asks nothing because nothing is left to save", async () => {
    const user = userEvent.setup();
    open();
    await user.click(await pencil(/editar leite meio gordo/i));
    const total = screen.getByLabelText("Preço total (€)");
    await user.clear(total);
    await user.type(total, "1,90");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    const row = screen.getByText("LEITE MEIO GORDO").closest("li")!;
    expect(within(row).getByText("1,70")).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Voltar às compras" }));
    expect(await screen.findByText("lista")).toBeInTheDocument();
  });

  it("opening another line does not lose the way back: the first one can still be cancelled to how it was read", async () => {
    const user = userEvent.setup();
    open();
    await user.click(await pencil(/editar leite meio gordo/i));
    const total = screen.getByLabelText("Preço total (€)");
    await user.clear(total);
    await user.type(total, "1,90");
    await user.click(screen.getByRole("button", { name: "Editar BANANA" })); // the first panel closes, its edit stays
    expect(screen.queryByText("1,90")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Editar LEITE MEIO GORDO" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    const row = screen.getByText("LEITE MEIO GORDO").closest("li")!;
    expect(within(row).getByText("1,70")).toBeInTheDocument();
  });

  it("«Cancelar» on a line that was just added takes it away", async () => {
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole("button", { name: "Adicionar linha" }));
    expect(screen.getByRole("heading", { level: 2, name: "Produtos · 3" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByRole("heading", { level: 2, name: "Produtos · 2" })).toBeInTheDocument();
  });

  it("«Mais opções» holds what the canvas does not show: the note, the product, the unit, the unit price and the discount; split and remove are always there", async () => {
    const user = userEvent.setup();
    open();
    await user.click(await pencil(/editar leite meio gordo/i));
    expect(screen.queryByLabelText("Unidade")).toBeNull();
    expect(screen.getByRole("button", { name: /dividir linha/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /remover linha/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Mais opções" }));
    expect(screen.getByText(/Na nota:/)).toBeInTheDocument();
    for (const label of ["Produto", "Unidade", "Preço unitário (€)", "Desconto (€)"]) expect(screen.getByLabelText(label)).toBeInTheDocument();
  });

  it("with many lines it shows the first five and «Ver os outros N produtos», and the rest comes with a click", async () => {
    serve({ lines: calm(8), review_reasons: [] });
    const user = userEvent.setup();
    open();
    expect(await screen.findByRole("heading", { level: 2, name: "Produtos · 8" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Editar PRODUTO/ })).toHaveLength(5);
    await user.click(screen.getByRole("button", { name: "Ver os outros 3 produtos" }));
    expect(screen.getAllByRole("button", { name: /^Editar PRODUTO/ })).toHaveLength(8);
    expect(screen.getByRole("button", { name: "Ver menos produtos" })).toBeInTheDocument();
  });

  it("never hides a line that asks for attention: a doubtful value, beyond the fifth, stays in sight", async () => {
    const lines = calm(8);
    lines[6] = line({ id: "dub", line_number: 7, raw_description: "PRODUTO DUVIDOSO", product: null, flags: ["low_confidence:line_total"], review_status: "NEEDS_REVIEW" });
    serve({ lines, review_reasons: [] });
    open();
    expect(await screen.findByRole("button", { name: "Editar PRODUTO DUVIDOSO" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver os outros 2 produtos" })).toBeInTheDocument();
  });
});

describe("Rever talão: «Ver talão original»", () => {
  const original = () =>
    server.use(http.get(`${API}/v1/receipts/r1/original`, ({ request }) => HttpResponse.json({ url: `https://files.test/${new URL(request.url).searchParams.get("photo")}`, expires_in_seconds: 60, content_type: "image/jpeg" })));

  it("opens the original in another tab", async () => {
    original();
    const win = vi.spyOn(window, "open").mockReturnValue(null);
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole("button", { name: "Ver talão original" }));
    await waitFor(() => expect(win).toHaveBeenCalledWith("https://files.test/1", "_blank", "noopener,noreferrer"));
  });

  it("has one button for each photo when the purchase has several", async () => {
    serve({ photo_count: 2 });
    original();
    const win = vi.spyOn(window, "open").mockReturnValue(null);
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole("button", { name: "Ver foto 2" }));
    expect(screen.getByRole("button", { name: "Ver foto 1" })).toBeInTheDocument();
    await waitFor(() => expect(win).toHaveBeenCalledWith("https://files.test/2", "_blank", "noopener,noreferrer"));
  });

  it("is not offered when the original is already gone", async () => {
    serve({ original_available: false });
    open();
    await screen.findByRole("heading", { level: 1, name: "Rever talão" });
    expect(screen.queryByRole("button", { name: /ver talão original|ver foto/i })).toBeNull();
  });
});
