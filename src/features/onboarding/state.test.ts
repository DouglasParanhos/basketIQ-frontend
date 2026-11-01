import { describe, expect, it } from "vitest";
import { emptyProfile, profile } from "../../test/fixtures";
import {
  buildPatch,
  initialState,
  initialsOf,
  isAllGoals,
  progressPercent,
  reduce,
  toggleAllGoals,
  type Action,
  type OnboardingState,
} from "./state";

const start = () => initialState(null);
const run = (state: OnboardingState, ...actions: Action[]) => actions.reduce(reduce, state);

describe("goals (F-113, RF-14)", () => {
  it("F-113: «Todas as anteriores» marks the three goals, and clears them when they are all marked", () => {
    expect(toggleAllGoals([])).toEqual(["finances", "shopping_list", "savings"]);
    expect(toggleAllGoals(["finances"])).toEqual(["finances", "shopping_list", "savings"]);
    expect(toggleAllGoals(["finances", "shopping_list", "savings"])).toEqual([]);
  });

  it("F-113: marking the three makes «Todas as anteriores» marked, and clearing one unmarks it", () => {
    const toggle = (goal: "finances" | "shopping_list" | "savings"): Action => ({ type: "toggleGoal", goal });
    const three = run(start(), toggle("finances"), toggle("shopping_list"), toggle("savings"));
    expect(isAllGoals(three.goals)).toBe(true);
    expect(isAllGoals(reduce(three, toggle("savings")).goals)).toBe(false);
  });
});

describe("people (F-113, RF-13)", () => {
  it("F-113: starts at 2, never goes below 1 or above 12", () => {
    expect(start().householdSize).toBe(2);
    expect(run(start(), { type: "people", delta: -1 }).householdSize).toBe(1);
    expect(run(start(), { type: "people", delta: -1 }, { type: "people", delta: -1 }).householdSize).toBe(1);
    let state = start();
    for (let i = 0; i < 20; i++) state = reduce(state, { type: "people", delta: 1 });
    expect(state.householdSize).toBe(12);
  });
});

describe("goal amount (F-113, RF-13)", () => {
  it("F-113: starts at 300 €, stays between 50 € and 800 €, and moving it turns «Ainda não sei» off", () => {
    expect(start().goalEuros).toBe(300);
    const unknown = run(start(), { type: "toggleGoalUnknown" });
    expect(unknown.goalUnknown).toBe(true);
    const moved = reduce(unknown, { type: "goalEuros", euros: 420 });
    expect(moved.goalEuros).toBe(420);
    expect(moved.goalUnknown).toBe(false);
    expect(reduce(start(), { type: "goalEuros", euros: 5 }).goalEuros).toBe(50);
    expect(reduce(start(), { type: "goalEuros", euros: 9000 }).goalEuros).toBe(800);
  });
});

describe("initials of a merchant (F-113, RF-13)", () => {
  it("F-113: first letter, or two letters when the name starts with an article", () => {
    expect(initialsOf("Pingo Doce")).toBe("P");
    expect(initialsOf("Lidl")).toBe("L");
    expect(initialsOf("El Corte Inglés")).toBe("EC");
    expect(initialsOf("el corte inglés")).toBe("EC");
    expect(initialsOf("O Talho")).toBe("OT");
    expect(initialsOf("El")).toBe("E");
    expect(initialsOf("")).toBe("");
  });
});

describe("progress and steps (F-113, RF-14)", () => {
  it("F-113: the bar goes 25, 50, 75 and 100 %, and «Voltar» does not go below the first step", () => {
    expect([0, 1, 2, 3].map(progressPercent)).toEqual([25, 50, 75, 100]);
    expect(reduce(start(), { type: "back" }).step).toBe(0);
    expect(run(start(), { type: "skip" }, { type: "skip" }, { type: "back" }).step).toBe(1);
  });

  it("F-113: the last step stays the last one after «Avançar» or «Saltar» (the page sends the PATCH)", () => {
    const last = run(start(), { type: "skip" }, { type: "skip" }, { type: "skip" });
    expect(last.step).toBe(3);
    expect(reduce(last, { type: "next" }).step).toBe(3);
    expect(reduce(last, { type: "skip" }).step).toBe(3);
  });

  it("F-113: «Voltar» keeps what was answered", () => {
    const state = run(start(), { type: "people", delta: 1 }, { type: "next" }, { type: "back" });
    expect(state.step).toBe(0);
    expect(state.householdSize).toBe(3);
  });
});

describe("what is sent (F-114, RF-14, constituição III)", () => {
  it("F-114: everything skipped sends only onboarding_completed", () => {
    const state = run(start(), { type: "skip" }, { type: "skip" }, { type: "skip" }, { type: "skip" });
    expect(buildPatch(state)).toEqual({ onboarding_completed: true });
  });

  it("F-114: 3 people confirmed and the goal skipped sends only household_size", () => {
    const state = run(
      start(),
      { type: "skip" },
      { type: "people", delta: 1 },
      { type: "next" },
      { type: "skip" },
      { type: "skip" },
    );
    expect(buildPatch(state)).toEqual({ household_size: 3, onboarding_completed: true });
  });

  it("F-114: «Avançar» on the suggested 2 people confirms them", () => {
    const state = run(start(), { type: "skip" }, { type: "next" });
    expect(buildPatch(state)).toEqual({ household_size: 2, onboarding_completed: true });
  });

  it("F-114: goals and merchants confirmed with nothing chosen send no value", () => {
    const state = run(start(), { type: "next" }, { type: "skip" }, { type: "next" }, { type: "skip" });
    expect(buildPatch(state)).toEqual({ onboarding_completed: true });
  });

  it("F-114: «Ainda não sei» confirmed sends no goal; a goal of 300 € is 30000 cents", () => {
    const unknown = run(start(), { type: "skip" }, { type: "skip" }, { type: "skip" }, { type: "toggleGoalUnknown" }, { type: "next" });
    expect(buildPatch(unknown)).toEqual({ onboarding_completed: true });
    const known = run(start(), { type: "skip" }, { type: "skip" }, { type: "skip" }, { type: "next" });
    expect(buildPatch(known)).toEqual({ monthly_goal_cents: 30000, onboarding_completed: true });
  });

  it("F-114: a full run sends the confirmed values, and never null or empty lists", () => {
    const state = run(
      start(),
      { type: "toggleGoal", goal: "finances" },
      { type: "next" },
      { type: "next" },
      { type: "toggleMerchant", id: "LIDL" },
      { type: "toggleMerchant", id: "CONTINENTE" },
      { type: "next" },
      { type: "goalEuros", euros: 250 },
      { type: "next" },
    );
    const patch = buildPatch(state);
    expect(patch).toEqual({
      goals: ["finances"],
      household_size: 2,
      merchants: ["LIDL", "CONTINENTE"],
      monthly_goal_cents: 25000,
      onboarding_completed: true,
    });
    expect(JSON.stringify(patch)).not.toContain("null");
  });

  it("F-114: going back to a confirmed step and skipping it keeps the confirmation", () => {
    const state = run(
      start(),
      { type: "skip" },
      { type: "people", delta: 1 },
      { type: "next" },
      { type: "back" },
      { type: "skip" },
    );
    expect(state.step).toBe(2);
    expect(buildPatch(state).household_size).toBe(3);
  });

  it("F-114: merchants the API no longer lists are dropped before sending", () => {
    const state = run(start(), { type: "skip" }, { type: "skip" }, { type: "toggleMerchant", id: "LOJA_ANTIGA" }, { type: "toggleMerchant", id: "LIDL" }, { type: "next" });
    expect(buildPatch(state, ["LIDL", "ALDI"]).merchants).toEqual(["LIDL"]);
    const onlyStale = run(start(), { type: "skip" }, { type: "skip" }, { type: "toggleMerchant", id: "LOJA_ANTIGA" }, { type: "next" });
    expect(buildPatch(onlyStale, ["LIDL"])).toEqual({ onboarding_completed: true });
  });
});

describe("saved values at the start (F-116, RF-14)", () => {
  it("F-116: a profile with values opens the steps with them, none confirmed", () => {
    const state = initialState({ ...profile, onboarding_completed_at: null, household_size: 4, goals: ["savings"], merchants: ["ALDI"], monthly_goal_cents: 42000 });
    expect(state).toMatchObject({ householdSize: 4, goals: ["savings"], merchants: ["ALDI"], goalEuros: 420, goalUnknown: false });
    expect(buildPatch(state)).toEqual({ onboarding_completed: true });
  });

  it("F-116: an empty profile keeps the suggestions (2 people, 300 €) and none is saved", () => {
    const state = initialState(emptyProfile());
    expect(state).toMatchObject({ householdSize: 2, goalEuros: 300, goals: [], merchants: [] });
    expect(buildPatch(state)).toEqual({ onboarding_completed: true });
  });

  it("F-116: a saved goal is shown on the nearest 10 € step inside the bar", () => {
    expect(initialState({ ...emptyProfile(), monthly_goal_cents: 5000 }).goalEuros).toBe(50);
    expect(initialState({ ...emptyProfile(), monthly_goal_cents: 45500 }).goalEuros).toBe(460);
    expect(initialState({ ...emptyProfile(), monthly_goal_cents: 80000 }).goalEuros).toBe(800);
  });
});
