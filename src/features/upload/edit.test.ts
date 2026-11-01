import { describe, expect, it } from "vitest";
import { isEdited, NO_EDIT } from "./edit";

describe("edit of one part (spec 013, A5)", () => {
  it("F-201: NO_EDIT is the unedited state", () => {
    expect(NO_EDIT).toEqual({ rotation: 0, zoom: 1, crop: { x: 0, y: 0 }, aspect: null, area: null });
    expect(isEdited(NO_EDIT)).toBe(false);
  });

  it.each([
    ["a rotation", { rotation: 90 }],
    ["a zoom", { zoom: 1.5 }],
    ["a crop format", { aspect: 1 / 3 }],
  ])("F-201: %s counts as an edit", (_name, change) => {
    expect(isEdited({ ...NO_EDIT, ...change })).toBe(true);
  });

  it("F-201: only moving the crop at zoom 1 is not an edit (the whole image is kept)", () => {
    expect(isEdited({ ...NO_EDIT, crop: { x: 10, y: 5 } })).toBe(false);
    expect(isEdited({ ...NO_EDIT, area: { x: 0, y: 0, width: 100, height: 200 } })).toBe(false);
  });

  it("F-201: rotating back to 0 with no zoom or format is no longer an edit", () => {
    expect(isEdited({ ...NO_EDIT, rotation: 0, zoom: 1, aspect: null })).toBe(false);
  });
});
