import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Hint } from "./analyzeFrame";
import { CameraCapture, type CapturedPhoto } from "./CameraCapture";
import type { CameraState } from "./useCamera";

const camera = vi.hoisted(() => ({ state: "live" as CameraState, hint: "too_far" as Hint | null }));
vi.mock("./useCamera", () => ({
  useCameraStream: () => camera.state,
  useFrameGuidance: () => camera.hint,
}));

function renderCamera(photos: CapturedPhoto[] = [], props: Partial<Parameters<typeof CameraCapture>[0]> = {}) {
  const handlers = { onCapture: vi.fn(), onRetake: vi.fn(), onSystemCamera: vi.fn(), onClose: vi.fn() };
  const view = render(<CameraCapture photos={photos} {...handlers} {...props} />);
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
      const { rerender, onCapture, onRetake, onSystemCamera, onClose } = renderCamera();
      const live = () => document.querySelector("[aria-live=polite]")!.textContent;
      act(() => void vi.advanceTimersByTime(0));
      expect(live()).toBe("Aproxime a câmara do talão");
      camera.hint = "too_close";
      rerender(<CameraCapture photos={[]} {...{ onCapture, onRetake, onSystemCamera, onClose }} />);
      act(() => void vi.advanceTimersByTime(1000));
      expect(live()).toBe("Aproxime a câmara do talão");
      act(() => void vi.advanceTimersByTime(1600));
      expect(live()).toBe("Afaste um pouco a câmara");
    } finally {
      vi.useRealTimers();
    }
  });

  it("for the next part: the lines already taken, where to start, and Concluir", async () => {
    const user = userEvent.setup();
    const { onClose } = renderCamera([{ id: "p1", previewUrl: "blob:p1", warnings: [] }]);
    expect(screen.getByText("Linhas já fotografadas")).toBeInTheDocument();
    expect(screen.getByText("Parte 2 · comece onde a parte 1 acabou")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /concluir/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("for a third part: the lines of the second part, not the first, and where to start", () => {
    renderCamera([
      { id: "p1", previewUrl: "blob:p1", warnings: [] },
      { id: "p2", previewUrl: "blob:p2", warnings: ["blurry"] },
    ]);
    expect(screen.getByText("Parte 3 · comece onde a parte 2 acabou")).toBeInTheDocument();
    const strip = screen.getByText("Linhas já fotografadas").parentElement!;
    expect(strip.querySelector("img")).toHaveAttribute("src", "blob:p2");
    expect(screen.getByRole("button", { name: "Repetir a foto 2" })).toBeInTheDocument(); // the last one taken
    expect(screen.getByRole("img", { name: "2 de 6 fotos" })).toBeInTheDocument();
  });

  it("offers to take the last photo again when it can be better", async () => {
    const user = userEvent.setup();
    const { onRetake } = renderCamera([{ id: "p1", previewUrl: "blob:p1", warnings: ["too_far"] }]);
    expect(screen.getByText(/o talão ficou pequeno na foto/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Repetir a foto 1" }));
    expect(onRetake).toHaveBeenCalledWith("p1");
  });

  it("stops at the photo limit", () => {
    const photos = Array.from({ length: 6 }, (_, i) => ({ id: `p${i}`, previewUrl: null, warnings: [] }));
    renderCamera(photos);
    expect(screen.getByRole("button", { name: "No máximo 6 fotos por talão" })).toBeDisabled();
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
