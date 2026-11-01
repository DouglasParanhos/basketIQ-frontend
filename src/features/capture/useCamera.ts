import { useEffect, useState, type RefObject } from "react";
import { analyzeFrame, minPaperFrac, type Hint } from "./analyzeFrame";
import { GrayFrame } from "./frame";
import { stabilizer } from "./hints";

export type CameraState = "starting" | "live" | "denied" | "unsupported";

const ANALYSIS_INTERVAL_MS = 250;
const LIVE_MARGIN = 1.1; // live guidance asks for a little more than the backend's minimum paper width

/** The browser can give the in-app camera: a secure page with the camera API. */
export function cameraSupported(): boolean {
  return window.isSecureContext === true && typeof navigator.mediaDevices?.getUserMedia === "function";
}

/** The rear camera in `video` while the page is visible; the tracks stop when it is hidden or closed. */
export function useCameraStream(video: RefObject<HTMLVideoElement | null>): CameraState {
  const [state, setState] = useState<CameraState>("starting");
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    const stop = () => {
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
    };
    const start = async () => {
      if (stream) return;
      try {
        const opened = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 3840 }, height: { ideal: 2160 } },
        });
        if (cancelled || document.hidden) {
          opened.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = opened;
        if (video.current) {
          video.current.srcObject = opened;
          try {
            await video.current.play();
          } catch {
            // autoPlay on the muted video starts it anyway
          }
        }
        setState("live");
      } catch (error) {
        if (!cancelled) setState(error instanceof DOMException && error.name === "NotAllowedError" ? "denied" : "unsupported");
      }
    };
    const onVisibility = () => (document.hidden ? stop() : void start());
    void start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, [video]);
  return state;
}

/** What to tell the person about the live picture, a few times a second, steadied over frames. */
export function useFrameGuidance(video: RefObject<HTMLVideoElement | null>, live: boolean, part: boolean): Hint | null {
  const [hint, setHint] = useState<Hint | null>(null);
  useEffect(() => {
    if (!live) return;
    const frames = new GrayFrame();
    const steady = stabilizer();
    const timer = window.setInterval(() => {
      const v = video.current;
      if (!v || v.readyState < 2 || !v.videoWidth) return;
      const frame = frames.read(v, v.videoWidth, v.videoHeight);
      if (!frame) return;
      const options = { part, minPaperFrac: minPaperFrac(v.videoWidth, LIVE_MARGIN) };
      setHint(steady(analyzeFrame(frame.gray, frame.w, frame.h, options)[0] ?? "ok"));
    }, ANALYSIS_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [video, live, part]);
  return hint;
}
