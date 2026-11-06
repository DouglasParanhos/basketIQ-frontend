import { Camera, X } from "lucide-react";
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { Button } from "../../components/ui";
import { nextPartText, type Part } from "../upload/photos";
import { canvasToJpeg } from "../upload/renderEdit";
import { quadFinder } from "./frame";
import { LIVE_TEXT } from "./hints";
import { edgeLengths, homography, lerpQuad, matrix3d, rectQuad, scaleQuad, type Quad } from "./homography";
import { useCameraStream, useFrameGuidance } from "./useCamera";

const ANNOUNCE_EVERY_MS = 2500; // a screen reader hears a change of advice at most this often
const CUT_MS = 350; // the receipt straightens in this long after the photo
const CUT_HOLD_MS = 200; // and stays straight this long before the camera closes
const CUT_FILL = 0.85; // of the picture: the straightened receipt fits in this share of it

/** The picture inside the video's border, in pixels of the video's parent. */
interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** A photo being cut: the frame taken, the receipt's corners in it, where the picture is, and what to call
 * when the cut is over. */
interface Cut {
  frame: HTMLCanvasElement;
  quad: Quad;
  box: Rect;
  done: () => void;
}

/** The in-app camera, for one photo: live advice on framing, distance, background, light and focus. When the
 * advice turns «ok» the photo is taken by itself (see `armed`). The shutter always works: the advice never
 * blocks a photo. After it the parts screen takes over, where «Adicionar outra parte» opens the camera again for the next part (spec 013, US2). `before` are the parts
 * before the one being taken: the last one is shown as the lines already taken. */
export function CameraCapture({
  before,
  onCapture,
  onSystemCamera,
  onClose,
}: {
  before: Pick<Part, "id" | "previewUrl">[];
  onCapture: (file: File) => void;
  onSystemCamera: () => void;
  onClose: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const state = useCameraStream(video);
  const last = before.at(-1);
  const part = last !== undefined;
  const { hint, quad } = useFrameGuidance(video, state === "live", part);
  const box = usePictureBox(video);
  const [cut, setCut] = useState<Cut | null>(null);
  const [announced, setAnnounced] = useState("");
  const [shooting, setShooting] = useState(false);

  useEffect(() => close.current?.focus(), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const text = hint ? LIVE_TEXT[hint] : "";
  const lastAnnounce = useRef(0);
  useEffect(() => {
    if (!text) return;
    const wait = Math.max(0, lastAnnounce.current + ANNOUNCE_EVERY_MS - Date.now());
    const timer = window.setTimeout(() => {
      lastAnnounce.current = Date.now();
      setAnnounced(text);
    }, wait);
    return () => window.clearTimeout(timer);
  }, [text]);

  async function shoot() {
    const v = video.current;
    if (!v || !v.videoWidth || shooting) return;
    setShooting(true);
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d")?.drawImage(v, 0, 0);
    const jpeg = canvasToJpeg(canvas); // the whole picture is what is sent
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const quad = box && !reduced ? quadFinder()(canvas, canvas.width, canvas.height) : null;
    try {
      if (quad && box) await new Promise<void>((done) => setCut({ frame: canvas, quad, box, done }));
      onCapture(new File([await jpeg], `parte-${before.length + 1}.jpg`, { type: "image/jpeg" }));
    } catch {
      // the frame could not be encoded: the person taps again
    } finally {
      canvas.width = 0; // free the full-resolution frame now
      setCut(null);
      setShooting(false);
    }
  }

  // Whether an «ok» takes the photo by itself: once per opening, and for a next part only after other advice
  // (the person moved), since on opening the camera still sees the part just taken.
  const armed = useRef(!part);
  const shootByItself = useEffectEvent(shoot);
  useEffect(() => {
    if (hint !== "ok") {
      if (hint) armed.current = true;
      return;
    }
    if (armed.current) {
      armed.current = false;
      shootByItself();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- an effect event is never a dependency (plugin 5 predates them)
  }, [hint]);

  const good = hint === "ok";
  return (
    <div role="dialog" aria-modal="true" aria-label="Fotografar o talão" className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      <div className="flex items-center justify-between gap-2 p-2">
        <button
          ref={close}
          type="button"
          onClick={onClose}
          aria-label="Fechar a câmara"
          className="inline-flex size-12 items-center justify-center rounded-full hover:bg-white/10"
        >
          <X aria-hidden className="size-6" />
        </button>
        <p className="text-sm font-semibold">{part ? `Parte ${before.length + 1}` : "Talão inteiro na imagem"}</p>
        <span className="size-12" aria-hidden />
      </div>

      {last?.previewUrl && (
        <div aria-hidden className="relative mx-4 mb-2 h-[16%] shrink-0 overflow-hidden rounded-lg border-2 border-dashed border-yellow-300">
          <img src={last.previewUrl} alt="" className="size-full object-cover object-bottom opacity-60" />
          <span className="absolute left-2 top-2 rounded bg-black/75 px-2 py-0.5 text-xs font-bold uppercase tracking-wide">
            Linhas já fotografadas
          </span>
        </div>
      )}
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4">
        {/* The border is the picture itself: what the camera sees is what is checked. */}
        <video
          ref={video}
          playsInline
          muted
          autoPlay
          aria-hidden
          className={`max-h-full max-w-full rounded-xl border-4 motion-safe:transition-colors ${
            state !== "live" ? "border-transparent" : good ? "border-green-400" : "border-yellow-300"
          }`}
        />
        {state === "live" && quad && box && !cut && (
          <svg aria-hidden viewBox="0 0 1 1" preserveAspectRatio="none" className="pointer-events-none absolute" style={box}>
            <polygon
              points={quad.map(([x, y]) => `${x},${y}`).join(" ")}
              vectorEffect="non-scaling-stroke"
              className={`fill-none stroke-3 [stroke-linejoin:round] ${good ? "stroke-green-400" : "stroke-yellow-300"}`}
            />
          </svg>
        )}
        {cut && <CutAnimation cut={cut} />}
        {(state === "denied" || state === "unsupported") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <p>
              {state === "denied"
                ? "A aplicação não tem acesso à câmara. Pode dar acesso nas definições do navegador ou usar a câmara do telemóvel."
                : "Não foi possível abrir a câmara neste navegador."}
            </p>
            <Button type="button" onClick={onSystemCamera}>
              <Camera aria-hidden className="size-5" /> Usar a câmara do telemóvel
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 p-4">
        {part && <p className="text-center text-sm">{nextPartText(before)}</p>}
        {state === "live" && (
          <p className={`min-h-6 text-center font-semibold ${good ? "text-green-300" : "text-yellow-300"}`} aria-hidden>
            {text}
          </p>
        )}
        <p className="sr-only" aria-live="polite">
          {announced}
        </p>
        <button
          type="button"
          onClick={() => void shoot()}
          disabled={state !== "live" || shooting}
          aria-label="Tirar a foto"
          className="mx-auto inline-flex size-18 items-center justify-center rounded-full border-4 border-white bg-white/20 disabled:opacity-40"
        >
          <span className="size-14 rounded-full bg-white" />
        </button>
      </div>
    </div>
  );
}

/** Where the picture is drawn: the video's box inside its border, kept up to date when it changes size; null
 * until it has one. */
function usePictureBox(video: RefObject<HTMLVideoElement | null>): Rect | null {
  const [box, setBox] = useState<Rect | null>(null);
  useLayoutEffect(() => {
    const v = video.current;
    if (!v) return;
    const measure = () =>
      setBox(v.clientWidth && v.clientHeight ? { left: v.offsetLeft + v.clientLeft, top: v.offsetTop + v.clientTop, width: v.clientWidth, height: v.clientHeight } : null);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(v);
    v.addEventListener("loadedmetadata", measure);
    return () => {
      observer.disconnect();
      v.removeEventListener("loadedmetadata", measure);
    };
  }, [video]);
  return box;
}

/** The photo just taken, frozen over the picture and cut to the receipt, which straightens into an upright
 * rectangle: each frame moves the corners a little closer and sets the perspective that takes them there. */
function CutAnimation({ cut }: { cut: Cut }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const { frame, box, done } = cut;
    const scale = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(box.width * scale);
    c.height = Math.round(box.height * scale);
    c.getContext("2d")?.drawImage(frame, 0, 0, c.width, c.height);
    const from = scaleQuad(cut.quad, box.width, box.height);
    const { width, height } = edgeLengths(from);
    const fit = Math.min((CUT_FILL * box.width) / width, (CUT_FILL * box.height) / height);
    const [w, h] = [width * fit, height * fit];
    const to = rectQuad((box.width - w) / 2, (box.height - h) / 2, w, h);
    let start: number | null = null; // the first frame: frames carry their own clock
    let frameId = 0;
    let hold = 0;
    const step = (now: number) => {
      start ??= now;
      const t = Math.min(1, (now - start) / CUT_MS);
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2; // ease in and out
      c.style.transform = matrix3d(homography(from, lerpQuad(from, to, e)));
      if (t < 1) frameId = requestAnimationFrame(step);
      else hold = window.setTimeout(done, CUT_HOLD_MS);
    };
    frameId = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frameId);
      window.clearTimeout(hold);
    };
  }, [cut]);
  const { box, quad } = cut;
  return (
    <>
      <div aria-hidden className="absolute inset-0 bg-black/80" />
      <canvas
        ref={canvas}
        data-cut
        aria-hidden
        className="pointer-events-none absolute origin-top-left"
        style={{ ...box, clipPath: `polygon(${quad.map(([x, y]) => `${x * 100}% ${y * 100}%`).join(", ")})` }}
      />
    </>
  );
}
