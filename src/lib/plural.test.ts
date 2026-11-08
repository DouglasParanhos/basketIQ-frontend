import { describe, expect, it } from "vitest";
import { plural } from "./format";

describe("plural (T-47)", () => {
  it.each([
    [0, "0 compras"],
    [1, "1 compra"],
    [2, "2 compras"],
    ["1", "1 compra"],
    ["2.5", "2,5 compras"],
  ])("F-253: %s is «%s»", (n, text) => {
    expect(plural(n, "compra", "compras")).toBe(text);
  });
});
