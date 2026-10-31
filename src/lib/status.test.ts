import { describe, expect, it } from "vitest";
import { ATTENTION, ERRORS, rowState } from "./status";

describe("the state of a purchase on a list (spec 012)", () => {
  it("F-195: reviewing and ready-to-confirm ask for attention; the five failures are errors", () => {
    expect([...ATTENTION].sort()).toEqual(["COMPLETED", "REVIEW_REQUIRED"]);
    expect([...ERRORS].sort()).toEqual(["INVALID_FORMAT", "PERMANENT_FAILURE", "TEMPORARY_FAILURE", "UNREADABLE", "UNSUPPORTED_MERCHANT"]);
  });

  it("F-195: rowState says attention, progress, error or confirmed from the status, never from needs_action", () => {
    expect(rowState("REVIEW_REQUIRED")).toBe("attention");
    expect(rowState("COMPLETED")).toBe("attention");
    for (const s of ["RECEIVED", "VALIDATING", "EXTRACTING"] as const) expect(rowState(s)).toBe("progress");
    for (const s of ["INVALID_FORMAT", "UNREADABLE", "UNSUPPORTED_MERCHANT", "TEMPORARY_FAILURE", "PERMANENT_FAILURE"] as const) expect(rowState(s)).toBe("error");
    expect(rowState("CONFIRMED")).toBe("confirmed");
  });
});
