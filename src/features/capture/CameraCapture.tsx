import { Camera, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui";
import { nextPartText, type Part } from "../upload/photos";
import { canvasToJpeg } from "../upload/renderEdit";
import { LIVE_TEXT } from "./hints";
import { useCameraStream, useFrameGuidance } from "./useCamera";

const ANNOUNCE_EVERY_MS = 2500; // a screen reader hears a change of advice at most this often

/** The in-app camera, for one photo: live advice on framing, distance, background, light and focus. The
 * shutter always works: the advice never blocks a photo. After it the parts screen takes over, where
 * «Adicionar outra parte» opens the camera again for the next part (spec 013, US2). `before` are the parts
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
  const hint = useFrameGuidance(video, state === "live", part);
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

  function shoot() {
    const v = video.current;
    if (!v || !v.videoWidth || shooting) return;
    setShooting(true);
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d")?.drawImage(v, 0, 0);
    void canvasToJpeg(canvas)
      .then((blob) => onCapture(new File([blob], `parte-${before.length + 1}.jpg`, { type: "image/jpeg" })))
      .catch(() => undefined) // the frame could not be encoded: the person taps again
      .finally(() => {
        canvas.width = 0; // free the full-resolution frame now
        setShooting(false);
      });
  }

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
          onClick={shoot}
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
