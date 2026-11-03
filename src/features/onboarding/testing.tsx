import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderRoutes } from "../../test/render";
import OnboardingPage from "./OnboardingPage";

/** Pieces shared by the onboarding tests: the route table and the small selectors. */
const routes = [
  { path: "/boas-vindas", element: <OnboardingPage /> },
  { path: "/", element: <p>Início de teste</p> },
  { path: "/privacidade", element: <p>Política de teste</p> },
  { path: "/adicionar", element: <p>Adicionar de teste</p> },
];

/** Text of the Brazilian prototype, of «orçamento» and of savings must never reach the screen. */
export const BANNED = /Pular|moram|orçamento|você|Calculamos pela sua média|poupar|economizar|poupou|economia/i;

export async function openOnboarding() {
  const view = { ...renderRoutes(routes, "/boas-vindas"), user: userEvent.setup() };
  await screen.findByRole("heading", { level: 1 });
  return view;
}

export type User = ReturnType<typeof userEvent.setup>;
export const press = (user: User, name: string) => user.click(screen.getByRole("button", { name }));
export const title = () => screen.getByRole("heading", { level: 1 });
export const allDone = () => screen.findByRole("heading", { level: 1, name: "Tudo pronto" });

/** Gives the step (0 to 3) an answer, because «Avançar» needs one: finances, 2 people, Lidl, 300 €. */
export async function answer(user: User, step: number) {
  if (step === 0) await user.click(screen.getByRole("checkbox", { name: /Organizar as minhas finanças/ }));
  if (step === 1) {
    await press(user, "Mais uma pessoa");
    await press(user, "Mais uma pessoa");
  }
  if (step === 2) await user.click(await screen.findByRole("checkbox", { name: "Lidl" }));
  if (step === 3) fireEvent.change(screen.getByRole("slider"), { target: { value: "300" } });
}

/** Answers and goes on, from the step given, `count` times: «Avançar», and «Concluir» on the fourth. */
export async function advance(user: User, count: number, from = 0) {
  for (let step = from; step < from + count; step++) {
    await answer(user, step);
    await press(user, step === 3 ? "Concluir" : "Avançar");
  }
}
