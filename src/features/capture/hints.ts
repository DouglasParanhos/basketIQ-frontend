import type { Hint } from "./analyzeFrame";

/** What the camera screen says, live (approved copy: specs/013-adicionar-v2/contracts/copy.md). */
export const LIVE_TEXT: Record<Hint, string> = {
  no_receipt: "Aponte a câmara para o talão",
  too_dark: "Está escuro: procure mais luz",
  bad_background: "Pouse o talão num fundo escuro: assim vemos onde acaba",
  cut_side: "O talão está cortado de lado: centre-o",
  too_close: "Afaste um pouco a câmara",
  cut_ends: "O talão não cabe: afaste-se ou fotografe por partes",
  too_far: "Aproxime a câmara do talão",
  blurry: "Imagem tremida ou desfocada: segure firme",
  ok: "Talão detetado · segure firme",
};

/** What is said about a photo already taken (the warnings of `checkStill`). */
const STILL_TEXT: Partial<Record<Hint, string>> = {
  too_dark: "A foto está escura.",
  too_far: "O talão ficou pequeno na foto: aproxime-se ou fotografe-o por partes.",
  blurry: "A foto está tremida ou desfocada.",
};

export function stillText(warnings: Hint[]): string {
  return warnings.map((w) => STILL_TEXT[w]).join(" ");
}

const STEADY_FRAMES = 3; // frames a new hint must hold before it is shown
const STEADY_FRAMES_OK = 4; // "ok" waits one frame more: praise only a steady picture

/** The shown hint changes only after the new one holds for a few frames, so the text does not flicker. The
 * first advice is shown at once, but not an «ok»: that takes the photo, so it always holds (null until then). */
export function stabilizer(): (hint: Hint) => Hint | null {
  let shown: Hint | null = null;
  let candidate: Hint | null = null;
  let count = 0;
  return (hint) => {
    if (shown === null && hint !== "ok") shown = hint;
    if (hint === shown) {
      candidate = null;
      count = 0;
      return shown;
    }
    count = hint === candidate ? count + 1 : 1;
    candidate = hint;
    if (count >= (hint === "ok" ? STEADY_FRAMES_OK : STEADY_FRAMES)) {
      shown = hint;
      candidate = null;
      count = 0;
    }
    return shown;
  };
}
