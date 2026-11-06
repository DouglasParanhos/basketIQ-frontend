import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Hint } from "./analyzeFrame";
import { CameraCapture } from "./CameraCapture";
import type { Quad } from "./homography";
import type { CameraState } from "./useCamera";

const RECEIPT: Quad = [
  [0.2, 0.1],
  [0.8, 0.12],
  [0.78, 0.9],
  [0.22, 0.88],
];

const camera = vi.hoisted(() => ({
  state: "live" as CameraState,
  hint: "too_far" as Hint | null,
  quad: null as Quad | null, // the corners drawn live
  shotQuad: null as Quad | null, // the corners found in the photo taken
}));
vi.mock("./useCamera", () => ({
  useCameraStream: () => camera.state,
  useFrameGuidance: () => ({ hint: camera.hint, quad: camera.quad }),
}));
vi.mock("./frame", async (original) => ({ ...(await original<typeof import("./frame")>()), quadFinder: () => () => camera.shotQuad }));

type Before = Parameters<typeof CameraCapture>[0]["before"];

/** Lets the JPEG encoding of a photo, if one was taken, settle. */
const flush = () => act(() => new Promise<void>((done) => setTimeout(done, 0)));

function renderCamera(before: Before = []) {
  const handlers = { onCapture: vi.fn(), onSystemCamera: vi.fn(), onClose: vi.fn() };
  const { rerender } = render(<CameraCapture before={before} {...handlers} />);
  /** Renders again with the same props, as when the advice changes. */
  const again = () => rerender(<CameraCapture before={before} {...handlers} />);
  return { ...handlers, again };
}

describe("CameraCapture", () => {
  beforeEach(() => {
    camera.state = "live";
    camera.hint = "too_far";
    camera.quad = null;
    camera.shotQuad = null;
    // The picture on screen: 360 × 640 inside the border.
    vi.spyOn(Element.prototype, "clientWidth", "get").mockReturnValue(360);
    vi.spyOn(Element.prototype, "clientHeight", "get").mockReturnValue(640);
    vi.spyOn(HTMLVideoElement.prototype, "videoWidth", "get").mockReturnValue(1080);
    vi.spyOn(HTMLVideoElement.prototype, "videoHeight", "get").mockReturnValue(1920);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn() } as never);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((done) => done(new Blob(["jpeg"], { type: "image/jpeg" })));
  });
  afterEach(() => vi.restoreAllMocks());

  it("says what to do, and the shutter works whatever the advice", async () => {
    const user = userEvent.setup();
    const { onCapture } = renderCamera();
    expect(screen.getByRole("dialog", { name: "Fotografar o talão" })).toBeInTheDocument();
    expect(screen.getByText("Aproxime a câmara do talão")).toBeInTheDocument();
    await flush();
    expect(onCapture).not.toHaveBeenCalled(); // advice other than «ok» never takes the photo by itself
    await user.click(screen.getByRole("button", { name: "Tirar a foto" }));
    expect(onCapture).toHaveBeenCalledWith(expect.objectContaining({ name: "parte-1.jpg", type: "image/jpeg" }));
  });

  it("when the receipt is ready, says so and takes the photo by itself", async () => {
    camera.hint = "ok";
    const { onCapture } = renderCamera();
    expect(screen.getByText("Talão detetado · segure firme")).toBeInTheDocument();
    await flush();
    expect(onCapture).toHaveBeenCalledWith(expect.objectContaining({ name: "parte-1.jpg", type: "image/jpeg" }));
  });

  it("for the next part: waits for the picture to change before taking it by itself", async () => {
    const before = [{ id: "p1", previewUrl: "blob:p1" }];
    camera.hint = null; // not analysed yet: this is not a move
    const { onCapture, again } = renderCamera(before);
    const show = async (hint: Hint) => {
      camera.hint = hint;
      again();
      await flush();
    };
    await show("ok"); // still the part just taken
    expect(onCapture).not.toHaveBeenCalled();
    await show("too_far"); // the person moved on
    expect(onCapture).not.toHaveBeenCalled();
    await show("ok");
    expect(onCapture).toHaveBeenCalledTimes(1);
    expect(onCapture).toHaveBeenCalledWith(expect.objectContaining({ name: "parte-2.jpg" }));
  });

  it("announces a change of advice to screen readers at most every few seconds", () => {
    vi.useFakeTimers();
    try {
      const { again } = renderCamera();
      const live = () => document.querySelector("[aria-live=polite]")!.textContent;
      act(() => void vi.advanceTimersByTime(0));
      expect(live()).toBe("Aproxime a câmara do talão");
      camera.hint = "too_close";
      again();
      act(() => void vi.advanceTimersByTime(1000));
      expect(live()).toBe("Aproxime a câmara do talão");
      act(() => void vi.advanceTimersByTime(1600));
      expect(live()).toBe("Afaste um pouco a câmara");
    } finally {
      vi.useRealTimers();
    }
  });

  it("for the next part: the lines already taken and where to start; the photo is named after the part", async () => {
    const user = userEvent.setup();
    const { onCapture } = renderCamera([{ id: "p1", previewUrl: "blob:p1" }]);
    expect(screen.getByText("Linhas já fotografadas")).toBeInTheDocument();
    expect(screen.getByText("Parte 2 · comece onde a parte 1 acabou")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tirar a foto" }));
    expect(onCapture).toHaveBeenCalledWith(expect.objectContaining({ name: "parte-2.jpg" }));
  });

  it("for a third part: the lines of the second part, not the first", () => {
    renderCamera([
      { id: "p1", previewUrl: "blob:p1" },
      { id: "p2", previewUrl: "blob:p2" },
    ]);
    expect(screen.getByText("Parte 3 · comece onde a parte 2 acabou")).toBeInTheDocument();
    const strip = screen.getByText("Linhas já fotografadas").parentElement!;
    expect(strip.querySelector("img")).toHaveAttribute("src", "blob:p2");
  });

  it("without access to the camera, offers the phone's own camera", async () => {
    camera.state = "denied";
    camera.hint = null;
    const user = userEvent.setup();
    const { onSystemCamera } = renderCamera();
    expect(screen.getByText(/não tem acesso à câmara/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /usar a câmara do telemóvel/i }));
    expect(onSystemCamera).toHaveBeenCalled();
  });

  it("F-226: draws the corners of the receipt over the picture, in the colour of the advice", () => {
    camera.quad = RECEIPT;
    const { again } = renderCamera();
    const outline = () => document.querySelector("svg polygon");
    expect(outline()).toHaveAttribute("points", "0.2,0.1 0.8,0.12 0.78,0.9 0.22,0.88");
    expect(outline()!.closest("svg")).toHaveAttribute("aria-hidden", "true");
    expect(outline()).toHaveClass("stroke-yellow-300");
    camera.hint = "ok";
    again();
    expect(outline()).toHaveClass("stroke-green-400");
  });

  it("F-226: no receipt, no outline", () => {
    renderCamera();
    expect(document.querySelector("svg polygon")).toBeNull();
  });

  it("F-227: with a receipt in the photo, the cut is shown before the camera closes; the whole picture is sent", async () => {
    camera.shotQuad = RECEIPT;
    const user = userEvent.setup();
    const { onCapture } = renderCamera();
    await user.click(screen.getByRole("button", { name: "Tirar a foto" }));
    expect(document.querySelector("[data-cut]")).toBeInTheDocument();
    expect(onCapture).not.toHaveBeenCalled();
    await waitFor(() => expect(onCapture).toHaveBeenCalledWith(expect.objectContaining({ name: "parte-1.jpg", type: "image/jpeg" })), { timeout: 2000 });
    expect(document.querySelector("[data-cut]")).toBeNull();
  });

  it("F-227: with reduced motion, no cut: the photo goes at once", async () => {
    camera.shotQuad = RECEIPT;
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({ matches: query.includes("reduce"), media: query }) as MediaQueryList);
    const user = userEvent.setup();
    const { onCapture } = renderCamera();
    await user.click(screen.getByRole("button", { name: "Tirar a foto" }));
    expect(document.querySelector("[data-cut]")).toBeNull();
    expect(onCapture).toHaveBeenCalled();
  });

  it("closes with Escape", async () => {
    const user = userEvent.setup();
    const { onClose } = renderCamera();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
