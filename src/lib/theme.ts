import { useSyncExternalStore } from "react";

/** What the person chose: follow the system, or one of the two. */
export type ThemePreference = "auto" | "light" | "dark";

/** Also read by the script in index.html, which sets the theme before the first paint: keep both in sync. */
export const THEME_KEY = "basketiq.theme";

const DARK = "(prefers-color-scheme: dark)";
const listeners = new Set<() => void>();

export function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return stored === "light" || stored === "dark" ? stored : "auto";
  } catch {
    return "auto";
  }
}

const systemIsDark = () => window.matchMedia?.(DARK).matches ?? false;

/** Puts the theme on the page (`data-theme` of <html>, which the styles read) and tells whoever listens, e.g. the charts. */
export function applyTheme(preference: ThemePreference = readPreference()) {
  const dark = preference === "dark" || (preference === "auto" && systemIsDark());
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  listeners.forEach((listener) => listener());
}

export function setPreference(preference: ThemePreference) {
  try {
    if (preference === "auto") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, preference);
  } catch {
    // The choice only lasts until the page closes; it still applies now.
  }
  applyTheme(preference);
}

export function subscribeTheme(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** Applies the theme and follows the system while the choice is «automático». Returns the way to stop. */
export function startTheme() {
  applyTheme();
  const media = window.matchMedia?.(DARK);
  const onSystemChange = () => applyTheme();
  media?.addEventListener("change", onSystemChange);
  return () => media?.removeEventListener("change", onSystemChange);
}

export function useThemePreference(): [ThemePreference, (preference: ThemePreference) => void] {
  return [useSyncExternalStore(subscribeTheme, readPreference, () => "auto"), setPreference];
}
