import type { Schemas } from "../../api/client";
import type { ProfilePatch } from "../profile/useProfile";

export type Profile = Schemas["ProfileOut"];
export type Goal = Profile["goals"][number];

/** The three values the API knows. «Todas as anteriores» is only a shortcut in the screen. */
const GOALS: readonly Goal[] = ["finances", "shopping_list", "savings"];

export const PEOPLE_MIN = 1;
export const PEOPLE_MAX = 12;
export const GOAL_MIN_EUROS = 50;
export const GOAL_MAX_EUROS = 800;
export const GOAL_STEP_EUROS = 10;
export const STEP_COUNT = 4;
export const LAST_STEP = STEP_COUNT - 1;

type Confirmed = { goals: boolean; people: boolean; merchants: boolean; goal: boolean };
const STEP_KEYS: readonly (keyof Confirmed)[] = ["goals", "people", "merchants", "goal"];

export interface OnboardingState {
  step: number;
  phase: "asking" | "done";
  goals: Goal[];
  /** `null` until the person says it: nothing is suggested. */
  householdSize: number | null;
  merchants: string[];
  /** `null` until the person moves the bar. */
  goalEuros: number | null;
  goalUnknown: boolean;
  /** Steps the person confirmed with «Avançar». «Saltar» never marks one. */
  confirmed: Confirmed;
}

export type Action =
  | { type: "toggleGoal"; goal: Goal }
  | { type: "toggleAllGoals" }
  | { type: "people"; delta: 1 | -1 }
  | { type: "toggleMerchant"; id: string }
  | { type: "goalEuros"; euros: number }
  | { type: "toggleGoalUnknown" }
  | { type: "next" }
  | { type: "skip" }
  | { type: "back" }
  | { type: "saved" };

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
const advance = (step: number) => Math.min(step + 1, LAST_STEP);

export function toggle<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export function isAllGoals(goals: readonly Goal[]): boolean {
  return GOALS.every((goal) => goals.includes(goal));
}

export function toggleAllGoals(goals: readonly Goal[]): Goal[] {
  return isAllGoals(goals) ? [] : [...GOALS];
}

export function progressPercent(step: number): number {
  return Math.round(((step + 1) / STEP_COUNT) * 100);
}

/** The screen starts from what is saved (a profile without conclusion) or empty: nothing is suggested, nothing is confirmed. */
export function initialState(saved: Profile | null): OnboardingState {
  const euros = saved?.monthly_goal_cents
    ? clamp(Math.round(saved.monthly_goal_cents / 100 / GOAL_STEP_EUROS) * GOAL_STEP_EUROS, GOAL_MIN_EUROS, GOAL_MAX_EUROS)
    : null;
  return {
    step: 0,
    phase: "asking",
    goals: [...(saved?.goals ?? [])],
    householdSize: saved?.household_size ?? null,
    merchants: [...(saved?.merchants ?? [])],
    goalEuros: euros,
    goalUnknown: false,
    confirmed: { goals: false, people: false, merchants: false, goal: false },
  };
}

export function reduce(state: OnboardingState, action: Action): OnboardingState {
  switch (action.type) {
    case "toggleGoal":
      return { ...state, goals: toggle(state.goals, action.goal) };
    case "toggleAllGoals":
      return { ...state, goals: toggleAllGoals(state.goals) };
    case "people":
      // The first «+» says 1; «−» with nothing said stays at nothing.
      if (state.householdSize === null) return action.delta === 1 ? { ...state, householdSize: PEOPLE_MIN } : state;
      return { ...state, householdSize: clamp(state.householdSize + action.delta, PEOPLE_MIN, PEOPLE_MAX) };
    case "toggleMerchant":
      return { ...state, merchants: toggle(state.merchants, action.id) };
    case "goalEuros":
      return { ...state, goalEuros: clamp(action.euros, GOAL_MIN_EUROS, GOAL_MAX_EUROS), goalUnknown: false };
    case "toggleGoalUnknown":
      return { ...state, goalUnknown: !state.goalUnknown };
    case "next":
      return { ...state, confirmed: { ...state.confirmed, [STEP_KEYS[state.step] as keyof Confirmed]: true }, step: advance(state.step) };
    case "skip":
      return { ...state, step: advance(state.step) };
    case "back":
      return { ...state, step: Math.max(state.step - 1, 0) };
    case "saved":
      return { ...state, phase: "done" };
  }
}

/** «Avançar» needs an answer on the step (or «Ainda não sei» on the last one); «Saltar» is the way to leave it empty. */
export function canAdvance(state: OnboardingState): boolean {
  switch (state.step) {
    case 0:
      return state.goals.length > 0;
    case 1:
      return state.householdSize !== null;
    case 2:
      return state.merchants.length > 0;
    default:
      return state.goalEuros !== null || state.goalUnknown;
  }
}

/**
 * The body of the one PATCH: only what the person confirmed with «Avançar» (constitution III), never a suggestion she
 * skipped, never null or an empty list. `knownMerchants` drops ids the API no longer lists (it would answer 422).
 */
export function buildPatch(state: OnboardingState, knownMerchants?: readonly string[]): ProfilePatch {
  const patch: ProfilePatch = { onboarding_completed: true };
  const { confirmed } = state;
  if (confirmed.goals && state.goals.length > 0) patch.goals = GOALS.filter((goal) => state.goals.includes(goal));
  if (confirmed.people && state.householdSize !== null) patch.household_size = state.householdSize;
  if (confirmed.merchants) {
    const ids = knownMerchants ? state.merchants.filter((id) => knownMerchants.includes(id)) : state.merchants;
    if (ids.length > 0) patch.merchants = ids;
  }
  if (confirmed.goal && !state.goalUnknown && state.goalEuros !== null) patch.monthly_goal_cents = state.goalEuros * 100;
  return patch;
}
