import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { consumption, line, receipt, summary } from "../test/fixtures";
import { renderRoutes } from "../test/render";
import { API, errorBody, server } from "../test/server";
import { LoginPage } from "./auth/LoginPage";
import { DashboardPage } from "./dashboard/DashboardPage";
import { ReceiptPage } from "./receipts/ReceiptPage";
import { SettingsPage } from "./settings/SettingsPage";
import { AddPage } from "./upload/AddPage";

const anonymous = () =>
  server.use(
    http.get(`${API}/v1/me`, () => HttpResponse.json(errorBody("unauthenticated", "x"), { status: 401 })),
    // The client tries one silent refresh before giving up.
    http.post(`${API}/v1/auth/refresh`, () => HttpResponse.json(errorBody("unauthenticated", "x"), { status: 401 })),
  );

describe("login (RF-01)", () => {
  it("F-03a: offers Google as the only sign-in method", async () => {
    anonymous();
    renderRoutes([{ path: "/login", element: <LoginPage /> }], "/login");
    const link = await screen.findByRole("link", { name: /entrar com google/i });
    expect(link).toHaveAttribute("href", "/v1/auth/login");
    expect(screen.queryByLabelText(/palavra-passe|password/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("F-03: explains a cancelled sign-in", async () => {
    anonymous();
    renderRoutes([{ path: "/login", element: <LoginPage /> }], "/login?error=cancelled");
    expect(await screen.findByText(/início de sessão foi cancelado/i)).toBeInTheDocument();
  });
});

function pickFile(input: HTMLElement, file: File) {
  return userEvent.upload(input as HTMLInputElement, file, { applyAccept: false });
}

describe("add receipt (RF-02..RF-04)", () => {
  const routes = [
    { path: "/adicionar", element: <AddPage /> },
    { path: "/compras/:id", element: <p>detalhe da compra</p> },
  ];

  it("F-06: the camera option opens the rear camera", () => {
    renderRoutes(routes, "/adicionar");
    const camera = screen.getByTestId("input-camera");
    expect(camera).toHaveAttribute("capture", "environment");
    expect(camera).toHaveAttribute("accept", "image/*");
    expect(screen.getByRole("button", { name: /fotografar/i })).toBeInTheDocument();
  });

  it("F-08: rejects an unsupported file before uploading", async () => {
    renderRoutes(routes, "/adicionar");
    await pickFile(screen.getByTestId("input-pdf"), new File(["MZ"], "virus.exe", { type: "application/x-msdownload" }));
    expect(await screen.findByText(/não é suportado/i)).toBeInTheDocument();
  });

  it("F-04: uploads a PDF, starts processing once and opens the receipt", async () => {
    const calls: string[] = [];
    let processKey: string | null = null;
    server.use(
      http.post(`${API}/v1/receipts/upload-init`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        calls.push(`init:${body.content_type}:${String(body.sha256).length}:${body.merchant_hint}`);
        return HttpResponse.json(
          { receipt_id: "r9", upload: { url: "http://storage.test/bucket", fields: { key: "k" }, expires_at: "2030-01-01T00:00:00Z" }, requirements: { max_bytes: 1, accepted_types: [], max_pdf_pages: 5 } },
          { status: 201 },
        );
      }),
      http.post("http://storage.test/bucket", () => {
        calls.push("storage");
        return new HttpResponse(null, { status: 204 });
      }),
      http.post(`${API}/v1/receipts/r9/process`, ({ request }) => {
        processKey = request.headers.get("Idempotency-Key");
        calls.push("process");
        return HttpResponse.json({ id: "j1", status: "QUEUED", attempt_count: 0, processing_route: null, created_at: "x" }, { status: 202 });
      }),
    );
    const user = userEvent.setup();
    renderRoutes(routes, "/adicionar");
    await pickFile(screen.getByTestId("input-pdf"), new File(["%PDF-1.4"], "fatura.pdf", { type: "application/pdf" }));
    await user.selectOptions(await screen.findByLabelText(/supermercado/i), "LIDL");
    await user.click(screen.getByRole("button", { name: /enviar nota/i }));
    expect(await screen.findByText("detalhe da compra")).toBeInTheDocument();
    expect(calls).toEqual(["init:application/pdf:64:LIDL", "storage", "process"]);
    expect(processKey).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("F-17: warns about a duplicate and lets the person keep a new version", async () => {
    const bodies: Record<string, unknown>[] = [];
    server.use(
      http.post(`${API}/v1/receipts/upload-init`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        bodies.push(body);
        if (!body.allow_duplicate) {
          return HttpResponse.json(
            errorBody("duplicate_suspected", "Este documento parece já ter sido importado.", {
              details: { duplicate_of: { receipt_id: "r1", merchant: "LIDL", purchase_at: "2026-09-12T10:15:00+01:00", total_cents: 905 } },
            }),
            { status: 409 },
          );
        }
        return HttpResponse.json({ receipt_id: "r10", upload: { url: "http://storage.test/b", fields: {}, expires_at: "x" }, requirements: { max_bytes: 1, accepted_types: [], max_pdf_pages: 5 } }, { status: 201 });
      }),
      http.post("http://storage.test/b", () => new HttpResponse(null, { status: 204 })),
      http.post(`${API}/v1/receipts/r10/process`, () => HttpResponse.json({ id: "j", status: "QUEUED", attempt_count: 0, processing_route: null, created_at: "x" }, { status: 202 })),
    );
    const user = userEvent.setup();
    renderRoutes(routes, "/adicionar");
    await pickFile(screen.getByTestId("input-pdf"), new File(["%PDF"], "f.pdf", { type: "application/pdf" }));
    await user.click(await screen.findByRole("button", { name: /enviar nota/i }));
    expect(await screen.findByText(/parece já ter sido importada/i)).toBeInTheDocument();
    expect(screen.getByText(/Lidl, .*9,05/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /guardar nova versão/i }));
    expect(await screen.findByText("detalhe da compra")).toBeInTheDocument();
    expect(bodies.map((b) => b.allow_duplicate)).toEqual([false, true]);
  });

  it("F-24: a network failure keeps the receipt and resumes with a fresh upload URL", async () => {
    let storageCalls = 0;
    let inits = 0;
    server.use(
      http.post(`${API}/v1/receipts/upload-init`, () => {
        inits++;
        return HttpResponse.json({ receipt_id: "r11", upload: { url: "http://storage.test/c", fields: {}, expires_at: "x" }, requirements: { max_bytes: 1, accepted_types: [], max_pdf_pages: 5 } }, { status: 201 });
      }),
      http.post("http://storage.test/c", () => {
        storageCalls++;
        return HttpResponse.error();
      }),
      http.post(`${API}/v1/receipts/r11/upload-url`, () => HttpResponse.json({ url: "http://storage.test/d", fields: {}, expires_at: "x" })),
      http.post("http://storage.test/d", () => HttpResponse.error()),
    );
    const user = userEvent.setup();
    renderRoutes(routes, "/adicionar");
    await pickFile(screen.getByTestId("input-pdf"), new File(["%PDF"], "f.pdf", { type: "application/pdf" }));
    await user.click(await screen.findByRole("button", { name: /enviar nota/i }));
    expect(await screen.findByText(/o envio não terminou/i)).toBeInTheDocument();
    expect(screen.getByText(/retoma de onde parou/i)).toBeInTheDocument();
    // Network back: retry reuses the same receipt (no second upload-init).
    server.use(
      http.post("http://storage.test/d", () => new HttpResponse(null, { status: 204 })),
      http.post(`${API}/v1/receipts/r11/process`, () => HttpResponse.json({ id: "j", status: "QUEUED", attempt_count: 0, processing_route: null, created_at: "x" }, { status: 202 })),
    );
    await user.click(screen.getByRole("button", { name: /tentar novamente/i }));
    expect(await screen.findByText("detalhe da compra")).toBeInTheDocument();
    expect(inits).toBe(1);
    expect(storageCalls).toBe(1);
  });
});

describe("review (RF-07, F-11..F-15)", () => {
  const routes = [{ path: "/compras/:id", element: <ReceiptPage /> }];

  it("F-12: low-confidence values are highlighted with text, not colour alone", async () => {
    renderRoutes(routes, "/compras/r1");
    const banana = await screen.findByRole("button", { name: /banana/i });
    expect(within(banana).getByText(/verificar quantidade/i)).toBeInTheDocument();
    expect(within(banana).getByText(/verificar preço unitário/i)).toBeInTheDocument();
    expect(screen.getByText(/reveja antes de confirmar/i)).toBeInTheDocument();
  });

  it("F-13: editing a line sends only the changed field with the version", async () => {
    let patch: Record<string, unknown> | null = null;
    server.use(
      http.patch(`${API}/v1/receipts/r1`, async ({ request }) => {
        patch = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          receipt({ version: 4, review_reasons: [], lines: [line(), line({ id: "l2", raw_description: "BANANA", quantity: "0.900", manually_edited: true, edited_fields: ["quantity"] })] }),
        );
      }),
    );
    const user = userEvent.setup();
    renderRoutes(routes, "/compras/r1");
    await user.click(await screen.findByRole("button", { name: /banana/i }));
    const qty = screen.getByLabelText("Quantidade");
    await user.clear(qty);
    await user.type(qty, "0,900");
    await user.click(screen.getByRole("button", { name: /^guardar$/i }));
    await waitFor(() => expect(patch).not.toBeNull());
    expect(patch).toEqual({ version: 3, lines: [{ id: "l1" }, { id: "l2", quantity: "0.900" }] });
    expect(await screen.findAllByText(/corrigido manualmente/i)).not.toHaveLength(0);
  });

  it("F-14: adds and removes lines, recalculating the sum", async () => {
    let lines: unknown[] = [];
    server.use(
      http.patch(`${API}/v1/receipts/r1`, async ({ request }) => {
        lines = ((await request.json()) as { lines: unknown[] }).lines;
        return HttpResponse.json(receipt({ version: 4 }));
      }),
    );
    const user = userEvent.setup();
    renderRoutes(routes, "/compras/r1");
    await user.click(await screen.findByRole("button", { name: /leite meio gordo/i }));
    await user.click(screen.getByRole("button", { name: /remover linha/i }));
    await user.click(screen.getByRole("button", { name: /adicionar linha/i }));
    await user.type(screen.getByLabelText("Descrição"), "PAO");
    await user.type(screen.getByLabelText("Total da linha (€)"), "0,40");
    expect(screen.getByText("Soma das linhas").nextSibling).toHaveTextContent("1,63");
    await user.click(screen.getByRole("button", { name: /^guardar$/i }));
    await waitFor(() => expect(lines).toHaveLength(2));
    expect(lines[0]).toEqual({ id: "l2" });
    expect(lines[1]).toMatchObject({ raw_description: "PAO", line_total_cents: 40, quantity: "1", unit: "un" });
  });

  it("F-15: confirms the purchase", async () => {
    let confirmed: unknown = null;
    server.use(
      http.post(`${API}/v1/receipts/r1/confirm`, async ({ request }) => {
        confirmed = await request.json();
        return HttpResponse.json(receipt({ status: "CONFIRMED", confirmed_by: "USER", confirmed_at: "2026-09-15T13:00:00Z" }));
      }),
    );
    const user = userEvent.setup();
    renderRoutes(routes, "/compras/r1");
    await user.click(await screen.findByRole("button", { name: /^confirmar$/i }));
    expect(await screen.findByText(/confirmada por si/i)).toBeInTheDocument();
    expect(confirmed).toEqual({ version: 3 });
  });

  it("F-07: an invalid document shows the reason and what to do", async () => {
    server.use(
      http.get(`${API}/v1/receipts/r1`, () =>
        HttpResponse.json(
          receipt({
            status: "INVALID_FORMAT",
            lines: [],
            review_reasons: [],
            error: { code: "pdf_corrupted", message: "O PDF está corrompido. Escolha outro ficheiro.", action: "Escolha um PDF, JPEG, PNG ou HEIC válido." },
          }),
        ),
      ),
    );
    renderRoutes(routes, "/compras/r1");
    expect(await screen.findByText(/o pdf está corrompido/i)).toBeInTheDocument();
    expect(screen.getByText(/escolha um pdf, jpeg/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^confirmar$/i })).not.toBeInTheDocument();
  });

  it("shows processing steps while the receipt is being read", async () => {
    server.use(http.get(`${API}/v1/receipts/r1`, () => HttpResponse.json(receipt({ status: "EXTRACTING", lines: [] }))));
    renderRoutes(routes, "/compras/r1");
    expect(await screen.findByText(/a ler os produtos/i)).toBeInTheDocument();
    expect(screen.getByText(/pode sair deste ecrã/i)).toBeInTheDocument();
  });

  it("F-22a: deleting only the original keeps the purchase", async () => {
    let deleted = false;
    server.use(
      http.get(`${API}/v1/receipts/r1`, () => HttpResponse.json(receipt({ status: "CONFIRMED", review_reasons: [] }))),
      http.delete(`${API}/v1/receipts/r1/original`, () => {
        deleted = true;
        return HttpResponse.json(receipt({ status: "CONFIRMED", original_available: false, original_deleted_at: "2026-09-16T00:00:00Z" }));
      }),
    );
    const user = userEvent.setup();
    renderRoutes(routes, "/compras/r1");
    await user.click(await screen.findByRole("button", { name: /apagar só o ficheiro/i }));
    await user.click(screen.getByRole("button", { name: /^apagar ficheiro$/i }));
    expect(await screen.findByText(/já foi apagado/i)).toBeInTheDocument();
    expect(deleted).toBe(true);
  });
});

describe("dashboard (RF-09, RF-11)", () => {
  const routes = [
    { path: "/", element: <DashboardPage /> },
    { path: "/adicionar", element: <p>adicionar</p> },
  ];

  it("F-21: explains how to import the first receipt when there is no data", async () => {
    server.use(http.get(`${API}/v1/receipts`, () => HttpResponse.json({ items: [], next_cursor: null })));
    renderRoutes(routes, "/");
    expect(await screen.findByRole("heading", { name: /comece pela primeira nota/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /adicionar a primeira nota/i })).toHaveAttribute("href", "/adicionar");
  });

  it("shows totals, variation, an accessible table and empty periods", async () => {
    renderRoutes(routes, "/?de=2026-09-01&ate=2026-09-30");
    expect(await screen.findByText("455,00 €")).toBeInTheDocument();
    expect(screen.getByText(/\+12,5 % face a/)).toBeInTheDocument();
    expect(screen.getByText("Ver como tabela")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: /gasto por período/i })).toBeInTheDocument();
  });

  it("F-19: the merchant filter is sent with the query", async () => {
    const seen: (string | null)[] = [];
    server.use(
      http.get(`${API}/v1/analytics/summary`, ({ request }) => {
        seen.push(new URL(request.url).searchParams.get("merchant"));
        return HttpResponse.json(summary());
      }),
    );
    const user = userEvent.setup();
    renderRoutes(routes, "/?de=2026-09-01&ate=2026-09-30");
    await user.selectOptions(await screen.findByLabelText("Supermercado"), "LIDL");
    await waitFor(() => expect(seen).toContain("LIDL"));
  });

  it("shows how often and how much of each product is bought, and omits the block when empty", async () => {
    renderRoutes(routes, "/?de=2026-09-01&ate=2026-09-30");
    const section = (await screen.findByRole("heading", { name: /consumo habitual/i })).closest("section")!;
    expect(within(section).getByRole("link", { name: "LEITE MEIO GORDO" })).toHaveAttribute("href", "/produtos/p1");
    expect(within(section).getByText(/3 compras · a cada 14 dias/)).toBeInTheDocument();
    expect(within(section).getByText("4,1 un./mês")).toBeInTheDocument();
  });

  it("hides the consumption block when there is nothing to show", async () => {
    server.use(http.get(`${API}/v1/analytics/consumption`, () => HttpResponse.json(consumption({ items: [], empty: true }))));
    renderRoutes(routes, "/?de=2026-09-01&ate=2026-09-30");
    expect(await screen.findByText("455,00 €")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /consumo habitual/i })).not.toBeInTheDocument();
  });

  it("does not draw a misleading chart with insufficient data", async () => {
    server.use(
      http.get(`${API}/v1/analytics/summary`, () =>
        HttpResponse.json(summary({ series: { granularity: "day", points: [{ period: "2026-09-02", spent_cents: 100 }], insufficient_data: true } })),
      ),
    );
    renderRoutes(routes, "/?de=2026-09-01&ate=2026-09-30");
    expect(await screen.findByText(/poucas compras neste período/i)).toBeInTheDocument();
  });
});

describe("settings (RF-12)", () => {
  it("F-23: account deletion explains the consequence and needs explicit confirmation", async () => {
    let deleted = false;
    server.use(
      http.delete(`${API}/v1/me`, () => {
        deleted = true;
        return HttpResponse.json({ receipts_deleted: 1, objects_deleted: 1 });
      }),
    );
    const user = userEvent.setup();
    renderRoutes([{ path: "/definicoes", element: <SettingsPage /> }], "/definicoes");
    await user.click(await screen.findByRole("button", { name: /^eliminar conta$/i }));
    expect(screen.getByText(/não pode ser desfeito/i)).toBeInTheDocument();
    const confirm = screen.getByRole("button", { name: /eliminar conta e dados/i });
    expect(confirm).toBeDisabled();
    await user.click(screen.getByRole("checkbox"));
    expect(confirm).toBeEnabled();
    expect(deleted).toBe(false);
  });
});
