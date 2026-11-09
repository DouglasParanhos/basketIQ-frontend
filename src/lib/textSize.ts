import { useSyncExternalStore } from "react";

/** The sizes of text a person can choose in Definições. `scale` multiplies every font size; boxes and touch targets stay as they are. */
export const TEXT_SIZES = [
  { id: "menor", label: "Menor", scale: 0.85 },
  { id: "padrao", label: "Padrão", scale: 0.94 },
  { id: "maior", label: "Maior", scale: 1.06 },
  { id: "muito-maior", label: "Muito maior", scale: 1.19 },
  { id: "maximo", label: "Máximo", scale: 1.31 },
] as const;

export type TextSize = (typeof TEXT_SIZES)[number]["id"];

export const DEFAULT_TEXT_SIZE: TextSize = "padrao";

/** Also read by the script in index.html, which sets the size before the first paint: keep both in sync. */
export const TEXT_SIZE_KEY = "basketiq.textSize";

const listeners = new Set<() => void>();

export function readTextSize(): TextSize {
  try {
    const stored = localStorage.getItem(TEXT_SIZE_KEY);
    return TEXT_SIZES.find((s) => s.id === stored)?.id ?? DEFAULT_TEXT_SIZE;
  } catch {
    return DEFAULT_TEXT_SIZE;
  }
}

/** Puts the size on the page (`--text-scale` of <html>, which the font sizes of the styles multiply by). */
export function applyTextSize(size: TextSize = readTextSize()) {
  const scale = TEXT_SIZES.find((s) => s.id === size)?.scale ?? 1;
  document.documentElement.style.setProperty("--text-scale", String(scale));
  listeners.forEach((listener) => listener());
}

export function setTextSize(size: TextSize) {
  try {
    if (size === DEFAULT_TEXT_SIZE) localStorage.removeItem(TEXT_SIZE_KEY);
    else localStorage.setItem(TEXT_SIZE_KEY, size);
  } catch {
    // The choice only lasts until the page closes; it still applies now.
  }
  applyTextSize(size);
}

export function useTextSize(): [TextSize, (size: TextSize) => void] {
  const size = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    readTextSize,
    () => DEFAULT_TEXT_SIZE,
  );
  return [size, setTextSize];
}
