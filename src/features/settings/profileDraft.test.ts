import { describe, expect, it } from "vitest";
import { emptyProfile, profile } from "../../test/fixtures";
import { nb } from "../../test/text";
import { buildPatch, countChanges, goalCents, initialDraft, stepPeople, validate, type ProfileDraft } from "./profileDraft";

const KNOWN = ["CONTINENTE", "PINGO_DOCE", "LIDL", "AUCHAN", "ALDI", "MERCADONA", "EL_CORTE_INGLES"];
const saved = { ...profile, household_size: 2, merchants: ["LIDL", "CONTINENTE"], goals: ["finances" as const], monthly_goal_cents: 30000 };
const edit = (changes: Partial<ProfileDraft>): ProfileDraft => ({ ...initialDraft(saved), ...changes });

describe("profile draft (spec 014)", () => {
  it("F-190: the draft starts from what is saved, with the goal as the person would type it", () => {
    expect(initialDraft(saved)).toEqual({ people: 2, merchants: ["LIDL", "CONTINENTE"], goals: ["finances"], goalText: "300,00" });
    expect(initialDraft(emptyProfile())).toEqual({ people: null, merchants: [], goals: [], goalText: "" });
  });

  it("F-190: counts every difference from the saved profile", () => {
    expect(countChanges(initialDraft(saved), saved)).toBe(0);
    expect(countChanges(edit({ people: 3 }), saved)).toBe(1);
    expect(countChanges(edit({ goalText: "450" }), saved)).toBe(1);
    expect(countChanges(edit({ goalText: "" }), saved)).toBe(1);
    expect(countChanges(edit({ merchants: ["LIDL", "AUCHAN"] }), saved)).toBe(2);
    expect(countChanges(edit({ goals: ["finances", "savings"] }), saved)).toBe(1);
    expect(countChanges(edit({ people: 3, goalText: "450", merchants: ["LIDL", "CONTINENTE", "ALDI", "AUCHAN"] }), saved)).toBe(4);
  });

  it("F-190: the order of the merchants does not count, and an empty goal over no goal is no change", () => {
    expect(countChanges(edit({ merchants: ["CONTINENTE", "LIDL"] }), saved)).toBe(0);
    expect(countChanges(initialDraft(emptyProfile()), emptyProfile())).toBe(0);
    expect(countChanges({ ...initialDraft(emptyProfile()), goalText: "350" }, emptyProfile())).toBe(1);
  });

  it("F-190: the goal is read in euros and must be between 50 and 800", () => {
    expect(goalCents(edit({ goalText: "450,50" }))).toBe(45050);
    expect(goalCents(edit({ goalText: "" }))).toBeNull();
    expect(goalCents(edit({ goalText: "abc" }))).toBeUndefined();
    const message = "A meta tem de estar entre 50 € e 800 €.";
    for (const text of ["30", "900", "49,99", "800,01", "abc"]) expect(validate(edit({ goalText: text })).goal, text).toBe(nb(message));
    for (const text of ["50", "800", "450,50", ""]) expect(validate(edit({ goalText: text })).goal, text).toBeUndefined();
  });

  it("F-190: the people counter starts from 1, never from a suggestion, and stays between 1 and 12", () => {
    expect(stepPeople(null, 1)).toBe(1);
    expect(stepPeople(null, -1)).toBeNull();
    expect(stepPeople(1, -1)).toBe(1);
    expect(stepPeople(12, 1)).toBe(12);
    expect(stepPeople(5, 1)).toBe(6);
    expect(stepPeople(5, -1)).toBe(4);
  });

  it("F-190: the PATCH carries only what changed", () => {
    expect(buildPatch(initialDraft(saved), saved, KNOWN)).toEqual({});
    expect(buildPatch(edit({ goalText: "350" }), saved, KNOWN)).toEqual({ monthly_goal_cents: 35000 });
    expect(buildPatch(edit({ people: 4, merchants: ["CONTINENTE"] }), saved, KNOWN)).toEqual({ household_size: 4, merchants: ["CONTINENTE"] });
  });

  it("F-190: clearing sends null for the goal and the people, and an empty list for the lists", () => {
    expect(buildPatch(edit({ goalText: "" }), saved, KNOWN)).toEqual({ monthly_goal_cents: null });
    expect(buildPatch(edit({ people: null }), saved, KNOWN)).toEqual({ household_size: null });
    expect(buildPatch(edit({ merchants: [] }), saved, KNOWN)).toEqual({ merchants: [] });
    expect(buildPatch(edit({ goals: [] }), saved, KNOWN)).toEqual({ goals: [] });
  });

  it("F-190: goals go in the canonical order and merchants in the order of the list", () => {
    expect(buildPatch(edit({ goals: ["savings", "finances"] }), saved, KNOWN)).toEqual({ goals: ["finances", "savings"] });
    expect(buildPatch(edit({ merchants: ["ALDI", "LIDL"] }), saved, KNOWN)).toEqual({ merchants: ["LIDL", "ALDI"] });
  });

  it("F-190: a saved merchant the API no longer lists is not sent, and is dropped if the merchants are touched", () => {
    const old = { ...saved, merchants: ["LIDL", "COVIRAN"] };
    expect(buildPatch(initialDraft(old), old, KNOWN)).toEqual({});
    expect(buildPatch({ ...initialDraft(old), people: 3 }, old, KNOWN)).toEqual({ household_size: 3 });
    expect(buildPatch({ ...initialDraft(old), merchants: ["LIDL", "COVIRAN", "ALDI"] }, old, KNOWN)).toEqual({ merchants: ["LIDL", "ALDI"] });
  });

  it("F-190, F-193: an account from before the onboarding sends only the goal, never the onboarding flag", () => {
    const migrated = emptyProfile({ onboarding_completed_at: "2026-10-31T00:00:00Z" });
    const patch = buildPatch({ ...initialDraft(migrated), goalText: "350" }, migrated, KNOWN);
    expect(patch).toEqual({ monthly_goal_cents: 35000 });
    expect(patch).not.toHaveProperty("onboarding_completed");
    expect(buildPatch(edit({ people: 3, goalText: "" }), saved, KNOWN)).not.toHaveProperty("onboarding_completed");
  });
});
