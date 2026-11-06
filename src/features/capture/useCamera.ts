import { useEffect, useState, type RefObject } from "react";
import { analyzeFrame, minPaperFrac, type Hint } from "./analyzeFrame";
import { GrayFrame, quadFinder } from "./frame";
import { lerpQuad, type Quad } from "./homography";
import { stabilizer } from "./hints";

export type CameraState = "starting" | "live" | "denied" | "unsupported";

const ANALYSIS_INTERVAL_MS = 250;
const LIVE_MARGIN = 1.1; // live guidance asks for a little more than the backend's minimum paper width
const QUAD_STEADY = 2; // analyses in a row that must find the corners before they are drawn
const QUAD_EASE = 0.5; // share of the way the drawn corners move to the new ones at each analysis

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

export interface Guidance {
  hint: Hint | null;
  /** The receipt's corners (shares of the picture) to draw over it; null while there is none. */
  quad: Quad | null;
}

/** What to tell the person about the live picture, a few times a second, steadied over frames, and where the
 * receipt is: its corners show after QUAD_STEADY analyses in a row find them, and move smoothly. */
export function useFrameGuidance(video: RefObject<HTMLVideoElement | null>, live: boolean, part: boolean): Guidance {
  const [guidance, setGuidance] = useState<Guidance>({ hint: null, quad: null });
  useEffect(() => {
    if (!live) return;
    const frames = new GrayFrame();
    const findQuad = quadFinder();
    const steady = stabilizer();
    let found = 0; // analyses in a row with corners
    let shown: Quad | null = null;
    const timer = window.setInterval(() => {
      const v = video.current;
      if (!v || v.readyState < 2 || !v.videoWidth) return;
      const frame = frames.read(v, v.videoWidth, v.videoHeight);
      if (!frame) return;
      const options = { part, minPaperFrac: minPaperFrac(v.videoWidth, LIVE_MARGIN) };
      const hints = analyzeFrame(frame.gray, frame.w, frame.h, options);
      const quad = hints.includes("no_receipt") ? null : findQuad(v, v.videoWidth, v.videoHeight);
      found = quad ? found + 1 : 0;
      shown = !quad || found < QUAD_STEADY ? null : shown ? lerpQuad(shown, quad, QUAD_EASE) : quad;
      const hint = steady(hints[0] ?? "ok");
      const next = shown;
      setGuidance((last) => (last.hint === hint && last.quad === next ? last : { hint, quad: next })); // unchanged: no render
    }, ANALYSIS_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [video, live, part]);
  return guidance;
}
