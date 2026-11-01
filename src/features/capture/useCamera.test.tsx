import { render, screen, waitFor } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cameraSupported, useCameraStream } from "./useCamera";

function Probe() {
  const video = useRef<HTMLVideoElement>(null);
  const state = useCameraStream(video);
  return (
    <>
      <video ref={video} muted aria-hidden />
      <p>{state}</p>
    </>
  );
}

function fakeStream() {
  const track = { stop: vi.fn() };
  return { stream: { getTracks: () => [track] } as unknown as MediaStream, track };
}

function setHidden(hidden: boolean) {
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("useCameraStream", () => {
  let getUserMedia: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    getUserMedia = vi.fn();
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  });
  afterEach(() => {
    Reflect.deleteProperty(navigator, "mediaDevices");
    Reflect.deleteProperty(document, "hidden");
    vi.restoreAllMocks();
  });

  it("opens the rear camera and stops it when closed", async () => {
    const { stream, track } = fakeStream();
    getUserMedia.mockResolvedValue(stream);
    const { unmount } = render(<Probe />);
    expect(await screen.findByText("live")).toBeInTheDocument();
    expect(getUserMedia.mock.calls[0]![0].video.facingMode).toEqual({ ideal: "environment" });
    unmount();
    expect(track.stop).toHaveBeenCalled();
  });

  it("stops the camera while the page is hidden and opens it again when visible", async () => {
    const first = fakeStream();
    const second = fakeStream();
    getUserMedia.mockResolvedValueOnce(first.stream).mockResolvedValueOnce(second.stream);
    render(<Probe />);
    await screen.findByText("live");
    setHidden(true);
    expect(first.track.stop).toHaveBeenCalled();
    setHidden(false);
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(2));
  });

  it("tells a refusal from a camera that cannot open", async () => {
    getUserMedia.mockRejectedValueOnce(new DOMException("no", "NotAllowedError"));
    const { unmount } = render(<Probe />);
    expect(await screen.findByText("denied")).toBeInTheDocument();
    unmount();
    getUserMedia.mockRejectedValueOnce(new DOMException("none", "NotFoundError"));
    render(<Probe />);
    expect(await screen.findByText("unsupported")).toBeInTheDocument();
  });
});

describe("cameraSupported", () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, "mediaDevices");
  });

  it("needs a secure page with the camera API", () => {
    expect(cameraSupported()).toBe(false); // jsdom: no navigator.mediaDevices
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn() } });
    expect(cameraSupported()).toBe(false); // not a secure page
    vi.stubGlobal("isSecureContext", true);
    expect(cameraSupported()).toBe(true);
    vi.unstubAllGlobals();
  });
});
