import type { Schemas } from "../../api/client";

export type Profile = Schemas["ProfileOut"];
type ProfilePatch = Schemas["ProfilePatch"];
export type Goal = Profile["goals"][number];

/** The three values the API knows. «Todas as anteriores» is only a shortcut in the screen. */
const GOALS: readonly Goal[] = ["finances", "shopping_list", "savings"];

export const PEOPLE_MIN = 1;
export const PEOPLE_MAX = 12;
const PEOPLE_SUGGESTED = 2;
export const GOAL_MIN_EUROS = 50;
export const GOAL_MAX_EUROS = 800;
export const GOAL_STEP_EUROS = 10;
const GOAL_SUGGESTED_EUROS = 300;
export const STEP_COUNT = 4;
export const LAST_STEP = STEP_COUNT - 1;

type Confirmed = { goals: boolean; people: boolean; merchants: boolean; goal: boolean };
const STEP_KEYS: readonly (keyof Confirmed)[] = ["goals", "people", "merchants", "goal"];

export interface OnboardingState {
  step: number;
  phase: "asking" | "done";
  goals: Goal[];
  householdSize: number;
  merchants: string[];
  goalEuros: number;
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

const ARTICLES = new Set(["el", "la", "los", "las", "o", "a", "os", "as"]);

/** First letter of a merchant name, or the first two when the name starts with an article ("El Corte Inglés" → "EC"). */
export function initialsOf(name: string): string {
  const [first = "", second] = name.trim().split(/\s+/);
  const letters = second && ARTICLES.has(first.toLowerCase()) ? first.charAt(0) + second.charAt(0) : first.charAt(0);
  return letters.toLocaleUpperCase("pt-PT");
}

export function progressPercent(step: number): number {
  return Math.round(((step + 1) / STEP_COUNT) * 100);
}

/** The screen starts from what is saved (a profile without conclusion) or from the suggestions. Nothing is confirmed yet. */
export function initialState(saved: Profile | null): OnboardingState {
  const euros = saved?.monthly_goal_cents
    ? clamp(Math.round(saved.monthly_goal_cents / 100 / GOAL_STEP_EUROS) * GOAL_STEP_EUROS, GOAL_MIN_EUROS, GOAL_MAX_EUROS)
    : GOAL_SUGGESTED_EUROS;
  return {
    step: 0,
    phase: "asking",
    goals: [...(saved?.goals ?? [])],
    householdSize: saved?.household_size ?? PEOPLE_SUGGESTED,
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

/**
 * The body of the one PATCH: only what the person confirmed with «Avançar» (constitution III), never a suggestion she
 * skipped, never null or an empty list. `knownMerchants` drops ids the API no longer lists (it would answer 422).
 */
export function buildPatch(state: OnboardingState, knownMerchants?: readonly string[]): ProfilePatch {
  const patch: ProfilePatch = { onboarding_completed: true };
  const { confirmed } = state;
  if (confirmed.goals && state.goals.length > 0) patch.goals = GOALS.filter((goal) => state.goals.includes(goal));
  if (confirmed.people) patch.household_size = state.householdSize;
  if (confirmed.merchants) {
    const ids = knownMerchants ? state.merchants.filter((id) => knownMerchants.includes(id)) : state.merchants;
    if (ids.length > 0) patch.merchants = ids;
  }
  if (confirmed.goal && !state.goalUnknown) patch.monthly_goal_cents = state.goalEuros * 100;
  return patch;
}
