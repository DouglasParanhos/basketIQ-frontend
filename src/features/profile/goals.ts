import type { Goal } from "../onboarding/state";

/** The three goals the API knows, with the words the onboarding and the profile show. */
export const GOAL_OPTIONS: { goal: Goal; title: string; hint: string }[] = [
  { goal: "finances", title: "Organizar as minhas finanças", hint: "Ver quanto gasto e onde" },
  { goal: "shopping_list", title: "Ajuda com a lista de compras", hint: "Saber o que costumo comprar" },
  { goal: "savings", title: "Gastar menos nas compras", hint: "Acompanhar o que gasto ao longo do tempo" },
];
