import { describe, expect, it, vi } from "vitest";
import { NO_EDIT } from "./edit";
import { add, canAdd, move, nextPartText, remove, setEdit, toUploadFiles, type Part } from "./photos";

const part = (id: string, over: Partial<Part> = {}): Part => ({
  id,
  file: new File([id], `${id}.jpg`, { type: "image/jpeg" }),
  type: "image/jpeg",
  previewUrl: `blob:${id}`,
  previewError: false,
  edit: NO_EDIT,
  ...over,
});
const pdfPart = (id: string): Part => part(id, { file: new File(["%PDF"], `${id}.pdf`, { type: "application/pdf" }), type: "application/pdf", previewUrl: null });
const ids = (parts: Part[]) => parts.map((p) => p.id);

describe("parts of one receipt (spec 013)", () => {
  it("F-201: an empty list accepts a photo and a PDF", () => {
    expect(canAdd([], "image/jpeg")).toBeNull();
    expect(canAdd([], "application/pdf")).toBeNull();
  });

  it("F-201: photos and a PDF are never mixed", () => {
    const mix = "Só é possível juntar fotografias a uma fotografia.";
    expect(canAdd([part("a")], "application/pdf")).toBe(mix);
    expect(canAdd([pdfPart("p")], "image/jpeg")).toBe(mix);
  });

  it("F-201: the sixth part is accepted and the seventh is refused with the limit", () => {
    const five = ["a", "b", "c", "d", "e"].map((id) => part(id));
    expect(canAdd(five, "image/jpeg")).toBeNull();
    expect(canAdd([...five, part("f")], "image/jpeg")).toBe("No máximo 6 fotos por talão.");
  });

  it("F-201: add appends; remove keeps the edit of the others", () => {
    const edited = { ...NO_EDIT, rotation: 90 as const };
    const list = add(add([part("a", { edit: edited })], part("b")), part("c"));
    expect(ids(list)).toEqual(["a", "b", "c"]);
    const rest = remove(list, "b");
    expect(ids(rest)).toEqual(["a", "c"]);
    expect(rest[0]!.edit).toBe(edited);
  });

  it("F-201: move swaps with the neighbour and does nothing past the ends", () => {
    const list = [part("a"), part("b"), part("c")];
    expect(ids(move(list, "a", 1))).toEqual(["b", "a", "c"]);
    expect(ids(move(list, "c", -1))).toEqual(["a", "c", "b"]);
    expect(ids(move(list, "a", -1))).toEqual(["a", "b", "c"]);
    expect(ids(move(list, "c", 1))).toEqual(["a", "b", "c"]);
  });

  it("F-201: setEdit replaces only the edit of that part", () => {
    const edited = { ...NO_EDIT, zoom: 2 };
    const list = setEdit([part("a"), part("b")], "b", edited);
    expect(list[0]!.edit).toBe(NO_EDIT);
    expect(list[1]!.edit).toBe(edited);
  });

  it("F-201: toUploadFiles sends, in order, the rendered JPEG of an edited part and the original of the others", async () => {
    const rendered = new Blob(["editado"]);
    const render = vi.fn(async (_url: string, _edit: { rotation: number }) => rendered);
    const heic = part("h", { file: new File(["h"], "h.heic", { type: "image/heic" }), type: "image/heic" });
    const files = await toUploadFiles([part("a", { edit: { ...NO_EDIT, rotation: 90 } }), heic, part("c")], render);
    expect(files.map((f) => [f.filename, f.contentType])).toEqual([
      ["a.jpg", "image/jpeg"],
      ["h.heic", "image/heic"],
      ["c.jpg", "image/jpeg"],
    ]);
    expect(files[0]!.blob).toBe(rendered);
    expect(files[1]!.blob).toBe(heic.file);
    expect(render).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledWith("blob:a", expect.objectContaining({ rotation: 90 }));
  });

  it("F-201: an edited part without a preview (HEIC that did not convert) goes as the original; a render name becomes .jpg", async () => {
    const render = vi.fn(async () => new Blob(["x"]));
    const noPreview = part("n", { file: new File(["n"], "n.heic", { type: "image/heic" }), type: "image/heic", previewUrl: null, edit: { ...NO_EDIT, zoom: 2 } });
    const edited = part("e", { file: new File(["e"], "recibo.png", { type: "image/png" }), type: "image/png", edit: { ...NO_EDIT, zoom: 2 } });
    const files = await toUploadFiles([noPreview, edited], render);
    expect(files[0]!.blob).toBe(noPreview.file);
    expect(files[1]!.filename).toBe("recibo.jpg");
    expect(files[1]!.contentType).toBe("image/jpeg");
  });

  it("F-203: the text for the next part follows the number of parts", () => {
    expect(nextPartText([part("a")])).toBe("Parte 2 · comece onde a parte 1 acabou");
    expect(nextPartText([part("a"), part("b")])).toBe("Parte 3 · comece onde a parte 2 acabou");
  });
});
