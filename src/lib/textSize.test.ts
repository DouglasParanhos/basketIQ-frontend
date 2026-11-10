import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyTextSize, DEFAULT_TEXT_SIZE, readTextSize, setTextSize, TEXT_SIZE_KEY, TEXT_SIZES } from "./textSize";

const scale = () => document.documentElement.style.getPropertyValue("--text-scale");

beforeEach(() => localStorage.clear());
afterEach(() => document.documentElement.style.removeProperty("--text-scale"));

describe("Tamanho do texto", () => {
  it("F-340: the choices go from smaller than the default to much larger, in order, and the default is in the middle", () => {
    const scales = TEXT_SIZES.map((s) => s.scale);
    expect(scales).toEqual([...scales].sort((a, b) => a - b));
    expect(TEXT_SIZES[0]!.scale).toBeLessThan(TEXT_SIZES.find((s) => s.id === DEFAULT_TEXT_SIZE)!.scale);
    expect(TEXT_SIZES.at(-1)!.scale).toBeGreaterThanOrEqual(1.3);
  });

  it("F-341: a choice is applied at once and kept on this device; the default is not stored; an unknown value falls back to the default", () => {
    expect(readTextSize()).toBe(DEFAULT_TEXT_SIZE);
    setTextSize("maximo");
    expect(scale()).toBe("1.31");
    expect(localStorage.getItem(TEXT_SIZE_KEY)).toBe("maximo");
    expect(readTextSize()).toBe("maximo");
    setTextSize(DEFAULT_TEXT_SIZE);
    expect(localStorage.getItem(TEXT_SIZE_KEY)).toBeNull();
    localStorage.setItem(TEXT_SIZE_KEY, "gigante");
    expect(readTextSize()).toBe(DEFAULT_TEXT_SIZE);
    applyTextSize();
    expect(scale()).toBe("0.94");
  });
});
