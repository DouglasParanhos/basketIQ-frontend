import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderRoutes } from "../../test/render";
import OnboardingPage from "./OnboardingPage";

/** Pieces shared by the onboarding tests: the route table and the small selectors. */
const routes = [
  { path: "/boas-vindas", element: <OnboardingPage /> },
  { path: "/", element: <p>Início de teste</p> },
  { path: "/privacidade", element: <p>Política de teste</p> },
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
