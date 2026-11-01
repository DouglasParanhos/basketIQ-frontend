import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Hint } from "./analyzeFrame";
import { CameraCapture } from "./CameraCapture";
import type { CameraState } from "./useCamera";

const camera = vi.hoisted(() => ({ state: "live" as CameraState, hint: "too_far" as Hint | null }));
vi.mock("./useCamera", () => ({
  useCameraStream: () => camera.state,
  useFrameGuidance: () => camera.hint,
}));

type Before = Parameters<typeof CameraCapture>[0]["before"];

function renderCamera(before: Before = []) {
  const handlers = { onCapture: vi.fn(), onSystemCamera: vi.fn(), onClose: vi.fn() };
  const view = render(<CameraCapture before={before} {...handlers} />);
  return { ...handlers, ...view };
}

describe("CameraCapture", () => {
  beforeEach(() => {
    camera.state = "live";
    camera.hint = "too_far";
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
    await user.click(screen.getByRole("button", { name: "Tirar a foto" }));
    expect(onCapture).toHaveBeenCalledWith(expect.objectContaining({ name: "parte-1.jpg", type: "image/jpeg" }));
  });

  it("tells when the receipt is ready", () => {
    camera.hint = "ok";
    renderCamera();
    expect(screen.getByText("Talão detetado · pode fotografar")).toBeInTheDocument();
  });

  it("announces a change of advice to screen readers at most every few seconds", () => {
    vi.useFakeTimers();
    try {
      const { rerender, onCapture, onSystemCamera, onClose } = renderCamera();
      const live = () => document.querySelector("[aria-live=polite]")!.textContent;
      act(() => void vi.advanceTimersByTime(0));
      expect(live()).toBe("Aproxime a câmara do talão");
      camera.hint = "too_close";
      rerender(<CameraCapture before={[]} {...{ onCapture, onSystemCamera, onClose }} />);
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

  it("closes with Escape", async () => {
    const user = userEvent.setup();
    const { onClose } = renderCamera();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
