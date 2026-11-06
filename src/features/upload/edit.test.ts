import { describe, expect, it } from "vitest";
import type { Quad } from "../capture/homography";
import { isEdited, NO_EDIT } from "./edit";

const MOVED: Quad = [
  [0.1, 0.1],
  [0.9, 0.12],
  [0.9, 0.9],
  [0.1, 0.88],
];

describe("edit of one part (specs 013 A5 and 017)", () => {
  it("F-229: NO_EDIT is the unedited state", () => {
    expect(NO_EDIT).toEqual({ rotation: 0, corners: null });
    expect(isEdited(NO_EDIT)).toBe(false);
  });

  it.each([
    ["a rotation", { rotation: 90 }],
    ["moved corners", { corners: MOVED }],
  ])("F-229: %s counts as an edit", (_name, change) => {
    expect(isEdited({ ...NO_EDIT, ...change })).toBe(true);
  });

  it("F-229: rotating back to 0 with the corners reset is no longer an edit", () => {
    expect(isEdited({ rotation: 0, corners: null })).toBe(false);
  });
});
