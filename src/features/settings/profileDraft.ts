import type { Schemas } from "../../api/client";
import { centsToInput, formatWholeEuros, parseEurToCents } from "../../lib/format";
import { GOAL_OPTIONS } from "../profile/goals";
import { GOAL_MAX_EUROS, GOAL_MIN_EUROS, PEOPLE_MAX, PEOPLE_MIN, type Goal } from "../onboarding/state";

type Profile = Schemas["ProfileOut"];
/** The generated type marks `onboarding_completed` (defaulted by the API) as required; the profile never sends it. */
export type ProfileChanges = Partial<Schemas["ProfilePatch"]>;

/** What the person is editing: a copy of the saved profile, with the goal as the text typed in the field. */
export interface ProfileDraft {
  people: number | null;
  merchants: string[];
  goals: Goal[];
  goalText: string;
}

const GOAL_RANGE_MESSAGE = `A meta tem de estar entre ${formatWholeEuros(GOAL_MIN_EUROS)} e ${formatWholeEuros(GOAL_MAX_EUROS)}.`;

export function initialDraft(saved: Profile): ProfileDraft {
  return {
    people: saved.household_size,
    merchants: [...saved.merchants],
    goals: [...saved.goals],
    goalText: centsToInput(saved.monthly_goal_cents),
  };
}

/** The counter never suggests a value: from «—» the first «Mais uma pessoa» gives 1 and «Menos» stays on «—». */
export function stepPeople(people: number | null, delta: 1 | -1): number | null {
  if (people === null) return delta === 1 ? PEOPLE_MIN : null;
  return Math.min(PEOPLE_MAX, Math.max(PEOPLE_MIN, people + delta));
}

/** The goal in cents; `null` when the field is empty (no goal), `undefined` when it cannot be read. */
export function goalCents(draft: ProfileDraft): number | null | undefined {
  if (draft.goalText.trim() === "") return null;
  return parseEurToCents(draft.goalText) ?? undefined;
}

export function validate(draft: ProfileDraft): { goal?: string } {
  const cents = goalCents(draft);
  if (cents === null) return {};
  const outOfRange = cents === undefined || cents < GOAL_MIN_EUROS * 100 || cents > GOAL_MAX_EUROS * 100;
  return outOfRange ? { goal: GOAL_RANGE_MESSAGE } : {};
}

const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((item) => b.includes(item));
const differences = (a: readonly string[], b: readonly string[]) => a.filter((x) => !b.includes(x)).length + b.filter((x) => !a.includes(x)).length;
const goalChanged = (draft: ProfileDraft, saved: Profile) => {
  const cents = goalCents(draft);
  return cents === undefined || cents !== saved.monthly_goal_cents;
};

/** Each difference from the saved profile: the people, the goal, and every merchant or goal added or removed. */
export function countChanges(draft: ProfileDraft, saved: Profile): number {
  return (
    Number(draft.people !== saved.household_size) +
    Number(goalChanged(draft, saved)) +
    differences(draft.merchants, saved.merchants) +
    differences(draft.goals, saved.goals)
  );
}

/**
 * The body of the one PATCH: only what changed (constitution III). Clearing sends null (people, goal) or [] (lists).
 * `onboarding_completed` is never sent: the profile does not touch it. The API only takes the merchants it lists, so
 * once the merchants change the unknown ones are dropped (if they do not change, the field is not sent at all).
 */
export function buildPatch(draft: ProfileDraft, saved: Profile, knownMerchants?: readonly string[]): ProfileChanges {
  const patch: ProfileChanges = {};
  if (draft.people !== saved.household_size) patch.household_size = draft.people;
  if (!sameSet(draft.merchants, saved.merchants)) {
    patch.merchants = knownMerchants ? knownMerchants.filter((id) => draft.merchants.includes(id)) : [...draft.merchants];
  }
  if (!sameSet(draft.goals, saved.goals)) patch.goals = GOAL_OPTIONS.map((option) => option.goal).filter((goal) => draft.goals.includes(goal));
  const cents = goalCents(draft);
  if (cents !== undefined && cents !== saved.monthly_goal_cents) patch.monthly_goal_cents = cents;
  return patch;
}
