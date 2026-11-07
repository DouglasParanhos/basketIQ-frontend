import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyTheme, readPreference, setPreference, startTheme, subscribeTheme, THEME_KEY } from "./theme";

/** A matchMedia that the test can flip, like the system switching between light and dark. */
function fakeSystem(dark: boolean) {
  const state = { dark, listeners: new Set<() => void>() };
  window.matchMedia = vi.fn((query: string) => ({
    get matches() {
      return query.includes("dark") ? state.dark : false;
    },
    media: query,
    addEventListener: (_: string, fn: () => void) => state.listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => state.listeners.delete(fn),
  })) as unknown as typeof window.matchMedia;
  return {
    set(next: boolean) {
      state.dark = next;
      state.listeners.forEach((fn) => fn());
    },
  };
}

const theme = () => document.documentElement.dataset.theme;

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});
afterEach(() => vi.restoreAllMocks());

describe("the theme (automático, claro, escuro)", () => {
  it("without a choice it is automatic and follows the system", () => {
    fakeSystem(true);
    expect(readPreference()).toBe("auto");
    applyTheme();
    expect(theme()).toBe("dark");
    fakeSystem(false);
    applyTheme();
    expect(theme()).toBe("light");
  });

  it("«claro» and «escuro» ignore the system, and are kept", () => {
    fakeSystem(true);
    setPreference("light");
    expect(theme()).toBe("light");
    expect(localStorage.getItem(THEME_KEY)).toBe("light");
    fakeSystem(false);
    setPreference("dark");
    expect(theme()).toBe("dark");
    expect(readPreference()).toBe("dark");
  });

  it("«automático» forgets the choice and goes back to the system", () => {
    fakeSystem(true);
    setPreference("light");
    setPreference("auto");
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
    expect(theme()).toBe("dark");
  });

  it("a value that is not one of the three counts as automatic", () => {
    fakeSystem(false);
    localStorage.setItem(THEME_KEY, "roxo");
    expect(readPreference()).toBe("auto");
    applyTheme();
    expect(theme()).toBe("light");
  });

  it("a storage that fails does not break the screen: the theme still applies", () => {
    fakeSystem(false);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readPreference()).toBe("auto");
    expect(() => setPreference("dark")).not.toThrow();
    expect(theme()).toBe("dark");
  });

  it("when the system changes, automatic follows it and a choice does not", () => {
    const system = fakeSystem(false);
    const stop = startTheme();
    expect(theme()).toBe("light");
    system.set(true);
    expect(theme()).toBe("dark");
    setPreference("light");
    system.set(false);
    system.set(true);
    expect(theme()).toBe("light");
    stop();
  });

  it("tells whoever listens (the charts) after the theme is applied", () => {
    fakeSystem(false);
    const seen: (string | undefined)[] = [];
    const stop = subscribeTheme(() => seen.push(theme()));
    setPreference("dark");
    stop();
    setPreference("light");
    expect(seen).toEqual(["dark"]);
  });

  it("the script of index.html that avoids the flash reads the same key", () => {
    expect(readFileSync("index.html", "utf8")).toContain(`"${THEME_KEY}"`);
  });
});
