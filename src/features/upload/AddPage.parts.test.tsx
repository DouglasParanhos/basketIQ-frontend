import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderRoutes } from "../../test/render";
import { API, errorBody, server } from "../../test/server";
import { jpg, pdf, serveUpload, stubPreviewUrls } from "../../test/upload";
import { analyzeStill } from "../capture/analyzeStill";
import { AddPage } from "./AddPage";

vi.mock("./QuadEditor", async () => ({ QuadEditor: (await import("../../test/upload")).FakeQuadEditor }));
vi.mock("./renderEdit", () => ({ renderEdit: vi.fn(async (_url: string, edit: { rotation: number }) => new Blob([`editado:${edit.rotation}`])) }));
vi.mock("heic2any", () => ({ default: vi.fn(async () => new Blob(["jpeg"])) }));
// jsdom cannot decode images: the post-capture check is driven by each test (empty: nothing to say).
vi.mock("../capture/analyzeStill", () => ({ analyzeStill: vi.fn(async () => ({ warnings: [], whole: false, quad: null })) }));

const { released } = stubPreviewUrls();

const routes = [
  { path: "/adicionar", element: <AddPage /> },
  { path: "/compras/:id", element: <p>detalhe da compra</p> },
];

const pick = (testId: string, file: File) => userEvent.upload(screen.getByTestId(testId) as HTMLInputElement, file, { applyAccept: false });
const button = (name: string | RegExp) => screen.getByRole("button", { name });
const partsTitle = () => screen.findByRole("heading", { level: 1, name: "Confirme as partes" });

/** Opens the screen with the given photos picked, one after the other. */
async function withParts(...files: File[]) {
  const view = renderRoutes(routes, "/adicionar");
  for (const file of files) await pick("input-image", file);
  await partsTitle();
  await screen.findByText(files.at(-1)!.name);
  return { ...view, user: userEvent.setup() };
}

describe("Adicionar: the parts of one receipt (spec 013, US2)", () => {
  it("F-201: choosing the first photo opens «Confirme as partes» with the part, its actions and the focus on the title", async () => {
    await withParts(jpg("a.jpg"));
    expect(await partsTitle()).toHaveFocus();
    expect(screen.getByText("Parte 1")).toBeInTheDocument();
    for (const name of ["Recortar a parte 1", "Apagar a parte 1", "Adicionar outra parte", "Escolher da galeria", "Enviar talão"]) {
      expect(button(name)).toBeInTheDocument();
    }
    expect(screen.queryByText(/juntamos as \d fotos/i)).not.toBeInTheDocument();
  });

  it("F-201 (A5): the edit of a part is kept, and shown again, when switching, deleting and reordering", async () => {
    const { user } = await withParts(jpg("a.jpg"), jpg("b.jpg"), jpg("c.jpg"));
    const partOf = (name: string) => screen.getByText(name).closest("li") as HTMLElement;

    await user.click(within(partOf("a.jpg")).getByRole("button", { name: /recortar/i }));
    expect(screen.getByText(/rotação 0 cantos encontrados/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "rodar" }));
    await user.click(screen.getByRole("button", { name: "Concluir" }));

    await user.click(within(partOf("b.jpg")).getByRole("button", { name: /recortar/i }));
    expect(screen.getByText(/rotação 0 cantos encontrados/)).toBeInTheDocument(); // another part: its own edit
    await user.click(screen.getByRole("button", { name: "Concluir" }));

    await user.click(within(partOf("a.jpg")).getByRole("button", { name: /recortar/i }));
    expect(screen.getByText(/rotação 90/)).toBeInTheDocument(); // switching back: the edit is still there
    await user.click(screen.getByRole("button", { name: "Concluir" }));

    await user.click(within(partOf("b.jpg")).getByRole("button", { name: /apagar/i })); // deleting another part
    await user.click(within(partOf("a.jpg")).getByRole("button", { name: /descer/i })); // moving this one
    await user.click(within(partOf("a.jpg")).getByRole("button", { name: /recortar/i }));
    expect(screen.getByText(/rotação 90/)).toBeInTheDocument();
  });

  it("F-201 (A5): an edited part is sent rendered and the others as the original, in the order shown", async () => {
    const { calls, bodies } = serveUpload("r40");
    const { user } = await withParts(jpg("a.jpg"), jpg("b.jpg"));
    await user.click(button("Recortar a parte 1"));
    await user.click(screen.getByRole("button", { name: "rodar" }));
    await user.click(screen.getByRole("button", { name: "Concluir" }));
    await user.click(button("Descer a parte 1")); // b.jpg first, a.jpg second
    await user.click(button("Enviar talão · 2 fotos"));
    expect(await screen.findByText("detalhe da compra")).toBeInTheDocument();
    expect(calls).toEqual(["init:b.jpg", "photo:a.jpg", "storage:p0", "storage:p1", "process"]);
    expect(bodies["init:b.jpg"]!.size_bytes).toBe(5); // the original "b.jpg"
    expect(bodies["photo:a.jpg"]!.size_bytes).toBe("editado:90".length); // the rendered edit
    expect(bodies["photo:a.jpg"]!.content_type).toBe("image/jpeg");
  });

  it("F-201: the button says how many photos, and the text about joining appears from two parts", async () => {
    const { user } = await withParts(jpg("a.jpg"));
    expect(button("Enviar talão")).toBeInTheDocument();
    await pick("input-camera", jpg("b.jpg"));
    await screen.findByText("b.jpg");
    expect(button("Enviar talão · 2 fotos")).toBeInTheDocument();
    expect(
      screen.getByText("Juntamos as 2 fotos num só talão antes de enviar. Se as partes se sobrepuserem, cuidamos das linhas repetidas."),
    ).toBeInTheDocument();
    await user.click(button("Apagar a parte 2"));
    expect(button("Enviar talão")).toBeInTheDocument();
  });

  it("F-201: at six parts «Adicionar outra parte» is disabled and says why; a PDF cannot be added", async () => {
    await withParts(...["a", "b", "c", "d", "e", "f"].map((n) => jpg(`${n}.jpg`)));
    expect(button("Adicionar outra parte")).toBeDisabled();
    expect(button("Escolher da galeria")).toBeDisabled();
    expect(screen.getByText("No máximo 6 fotos por talão.")).toBeInTheDocument();
  });

  it("F-201: a PDF is refused after a photo, and as the first part there is no «Adicionar outra parte»", async () => {
    const view = await withParts(jpg("a.jpg"));
    await pick("input-pdf", pdf("f.pdf"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Só é possível juntar fotografias a uma fotografia.");
    expect(screen.queryByRole("button", { name: "Apagar a parte 2" })).not.toBeInTheDocument();
    view.unmount();

    renderRoutes(routes, "/adicionar");
    await pick("input-pdf", pdf("f.pdf"));
    await partsTitle();
    expect(screen.queryByRole("button", { name: "Adicionar outra parte" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /recortar/i })).not.toBeInTheDocument();
  });

  it("F-201: deleting the last part goes back to the first screen and releases the preview", async () => {
    const { user } = await withParts(jpg("a.jpg"));
    await user.click(button("Apagar a parte 1"));
    expect(await screen.findByRole("heading", { level: 1, name: "Adicionar talão" })).toBeInTheDocument();
    expect(released).toContain("blob:parte-1");
  });

  it("F-201: «Voltar» and «Cancelar» ask before losing the photos; «Continuar a editar» keeps them", async () => {
    const { user } = await withParts(jpg("a.jpg"), jpg("b.jpg"));
    for (const leave of ["Voltar", "Cancelar"]) {
      await user.click(button(leave));
      expect(screen.getByText("Descartar as 2 fotos?")).toBeInTheDocument();
      await user.click(button("Continuar a editar"));
      expect(screen.queryByText("Descartar as 2 fotos?")).not.toBeInTheDocument();
      expect(screen.getByText("b.jpg")).toBeInTheDocument();
    }
    await user.click(button("Voltar"));
    await user.click(button("Descartar"));
    expect(await screen.findByRole("heading", { level: 1, name: "Adicionar talão" })).toBeInTheDocument();
    expect(released).toEqual(expect.arrayContaining(["blob:parte-1", "blob:parte-2"]));
  });

  it("F-201: while sending, the controls of the parts are disabled; after an error they are active again", async () => {
    let open!: () => void;
    const gate = new Promise<void>((resolve) => (open = resolve));
    serveUpload("r41");
    server.use(
      http.post("http://storage.test/:name", async () => {
        await gate;
        return new HttpResponse(null, { status: 204 });
      }),
      http.post(`${API}/v1/receipts/r41/process`, () => HttpResponse.json(errorBody("boom", "Falhou."), { status: 500 })),
    );
    const { user } = await withParts(jpg("a.jpg"), jpg("b.jpg"));
    await user.click(button("Enviar talão · 2 fotos"));
    await waitFor(() => expect(button("Adicionar outra parte")).toBeDisabled());
    for (const name of ["Apagar a parte 1", "Recortar a parte 1", "Subir a parte 2", "Descer a parte 1", "Escolher da galeria"]) {
      expect(button(name)).toBeDisabled();
    }
    open();
    expect(await screen.findByText(/o envio não terminou/i)).toBeInTheDocument();
    expect(button("Adicionar outra parte")).toBeEnabled();
    expect(button("Apagar a parte 1")).toBeEnabled();
  });

  it("F-201: after a failure, changing the parts starts another upload and the duplicate warning of the abandoned one can be bypassed", async () => {
    const inits: boolean[] = [];
    serveUpload("r42");
    server.use(
      http.post(`${API}/v1/receipts/r42/process`, () => HttpResponse.json(errorBody("boom", "Falhou."), { status: 500 })),
      http.post(`${API}/v1/receipts/upload-init`, async ({ request }) => {
        const body = (await request.json()) as { allow_duplicate: boolean };
        inits.push(body.allow_duplicate);
        if (inits.length === 2 && !body.allow_duplicate) {
          return HttpResponse.json(
            errorBody("duplicate_suspected", "Este documento parece já ter sido importado.", {
              details: { duplicate_of: { receipt_id: "r42", merchant: null, purchase_at: null, total_cents: null } },
            }),
            { status: 409 },
          );
        }
        return HttpResponse.json(
          { receipt_id: "r42", upload: { url: "http://storage.test/p0", fields: {}, expires_at: "x" }, requirements: { max_bytes: 1, accepted_types: [], max_pdf_pages: 5, max_photos: 6 } },
          { status: 201 },
        );
      }),
    );
    const { user } = await withParts(jpg("a.jpg"), jpg("b.jpg"));
    await user.click(button("Enviar talão · 2 fotos"));
    expect(await screen.findByText(/o envio não terminou/i)).toBeInTheDocument();
    await user.click(button("Apagar a parte 2"));
    server.use(http.post(`${API}/v1/receipts/r42/process`, () => HttpResponse.json({ id: "j", status: "QUEUED", attempt_count: 0, processing_route: null, created_at: "x" }, { status: 202 })));
    await user.click(button("Enviar talão"));
    expect(await screen.findByText(/Este talão parece já ter sido importado/i)).toBeInTheDocument();
    await user.click(button(/guardar nova versão/i));
    expect(await screen.findByText("detalhe da compra")).toBeInTheDocument();
    expect(inits).toEqual([false, false, true]);
  });

  it("F-201: a HEIC part is previewed converted and, without an edit, the original HEIC is what is sent", async () => {
    const { bodies } = serveUpload("r43");
    const heic = new File(["heic"], "h.heic", { type: "image/heic" });
    const { user } = await withParts(heic);
    await user.click(button("Enviar talão"));
    expect(await screen.findByText("detalhe da compra")).toBeInTheDocument();
    expect(bodies["init:h.heic"]!.content_type).toBe("image/heic");
    expect(bodies["init:h.heic"]!.size_bytes).toBe(4);
  });

  it("F-201: the focus follows the parts: Recortar → title, Concluir → its button, delete → the screen title, add → the new part", async () => {
    const { user } = await withParts(jpg("a.jpg"), jpg("b.jpg"));
    await user.click(button("Recortar a parte 1"));
    expect(screen.getByRole("heading", { level: 2, name: "Recortar a parte 1" })).toHaveFocus();
    await user.click(button("Concluir"));
    expect(button("Recortar a parte 1")).toHaveFocus();
    await user.click(button("Apagar a parte 2"));
    expect(await partsTitle()).toHaveFocus();
    await pick("input-camera", jpg("c.jpg"));
    await screen.findByText("c.jpg");
    await waitFor(() => expect(button("Recortar a parte 2")).toHaveFocus());
  });

  it("F-203: the orientation for the next part is shown with «Adicionar outra parte» and follows the count", async () => {
    await withParts(jpg("a.jpg"));
    expect(screen.getByText("Parte 2 · comece onde a parte 1 acabou")).toBeInTheDocument();
    await pick("input-camera", jpg("b.jpg"));
    await screen.findByText("b.jpg");
    expect(screen.getByText("Parte 3 · comece onde a parte 2 acabou")).toBeInTheDocument();
    // The live advice is on the in-app camera (CameraCapture), not on this screen.
    expect(screen.queryByText(/captura automática|talão detetado/i)).not.toBeInTheDocument();
  });

  it("F-203: no orientation at the limit or with a PDF", async () => {
    await withParts(...["a", "b", "c", "d", "e", "f"].map((n) => jpg(`${n}.jpg`)));
    expect(screen.queryByText(/^Parte 7 ·/)).not.toBeInTheDocument();
  });

  it("F-200: the supermarket on the parts screen starts at «Detetar sozinho» and what is chosen there is the hint sent", async () => {
    const { bodies } = serveUpload("r44");
    const view = renderRoutes(routes, "/adicionar");
    const user = userEvent.setup();
    await pick("input-image", jpg("a.jpg"));
    await partsTitle();
    const field = await screen.findByLabelText("Supermercado (opcional)");
    expect(field).toHaveValue("");
    await user.selectOptions(field, "ALDI");
    expect(field).toHaveValue("ALDI");
    await user.click(button("Enviar talão"));
    expect(await screen.findByText("detalhe da compra")).toBeInTheDocument();
    expect(bodies["init:a.jpg"]!.merchant_hint).toBe("ALDI");
    view.unmount();
  });
});

describe("Adicionar: the in-app camera and the check of each photo (spec 013, US4 and US5)", () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, "mediaDevices");
    vi.unstubAllGlobals();
  });

  it("F-203: Fotografar and «Adicionar outra parte» open the in-app camera where the browser has one", async () => {
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: () => new Promise(() => {}) } });
    vi.stubGlobal("isSecureContext", true);
    const user = userEvent.setup();
    renderRoutes(routes, "/adicionar");
    await user.click(button(/fotografar/i));
    expect(screen.getByRole("dialog", { name: "Fotografar o talão" })).toBeInTheDocument();
    await user.click(button("Fechar a câmara"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("F-203: refused, the camera offers the phone's own, used from then on, and nothing is stored", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: () => Promise.reject(new DOMException("no", "NotAllowedError")) },
    });
    vi.stubGlobal("isSecureContext", true);
    const user = userEvent.setup();
    renderRoutes(routes, "/adicionar");
    const nativeCamera = vi.spyOn(screen.getByTestId("input-camera") as HTMLInputElement, "click");
    await user.click(button(/fotografar/i));
    await user.click(await screen.findByRole("button", { name: /usar a câmara do telemóvel/i }));
    expect(nativeCamera).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(button(/fotografar/i)); // straight to the phone's camera now
    expect(nativeCamera).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(sessionStorage.length + localStorage.length).toBe(0);
  });

  it("F-203: a photo that holds the whole receipt does not ask for the next part (another can still be added)", async () => {
    vi.mocked(analyzeStill).mockResolvedValueOnce({ warnings: [], whole: true, quad: null });
    await withParts(jpg("a.jpg"));
    expect(await screen.findByText("O talão parece completo nesta foto: pode enviar.")).toBeInTheDocument();
    expect(screen.queryByText(/Parte 2 · comece onde/)).not.toBeInTheDocument();
    expect(button("Adicionar outra parte")).toBeEnabled();
  });

  it("F-228: a part with the receipt found shows it straightened; one without shows the photo", async () => {
    const quad = [
      [0.2, 0.1],
      [0.8, 0.1],
      [0.8, 0.9],
      [0.2, 0.9],
    ] as const;
    vi.mocked(analyzeStill).mockResolvedValueOnce({ warnings: [], whole: false, quad });
    await withParts(jpg("a.jpg"), jpg("b.jpg"));
    const preview = (name: string) => screen.getByText(name).closest("li")!;
    await waitFor(() => expect(preview("a.jpg").querySelector("canvas[data-flat]")).toBeInTheDocument());
    expect(preview("a.jpg").querySelector("img")).toBeNull();
    expect(preview("b.jpg").querySelector("canvas[data-flat]")).toBeNull();
    expect(preview("b.jpg").querySelector("img")).toHaveAttribute("src", "blob:parte-2");
  });

  it("F-204: a part the backend would warn about says so, never blocks, and is taken again in its place", async () => {
    vi.mocked(analyzeStill).mockResolvedValueOnce({ warnings: ["too_far", "blurry"], whole: false, quad: null });
    const { user } = await withParts(jpg("a.jpg"));
    await pick("input-image", jpg("b.jpg"));
    await screen.findByText("b.jpg");
    expect(await screen.findByText(/o talão ficou pequeno na foto.*tremida ou desfocada.*pode enviá-la na mesma/i)).toBeInTheDocument();
    expect(button("Enviar talão · 2 fotos")).toBeEnabled();
    // No in-app camera in jsdom: the phone's camera opens, and the new photo replaces part 1.
    await user.click(button("Fotografar de novo a parte 1"));
    await pick("input-camera", jpg("a2.jpg"));
    await screen.findByText("a2.jpg");
    const names = screen.getAllByRole("listitem").map((li) => within(li).queryByText(/\.jpg$/)?.textContent);
    expect(names).toEqual(["a2.jpg", "b.jpg"]);
    expect(screen.queryByText(/o talão ficou pequeno/i)).not.toBeInTheDocument();
  });
});
