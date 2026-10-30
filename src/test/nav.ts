import { screen, within } from "@testing-library/react";

export const nav = () => screen.getByRole("navigation", { name: "Navegação principal" });

/** Labels of the bottom-navigation destinations marked as the current page. */
export const currentDestinations = () =>
  within(nav())
    .getAllByRole("link")
    .filter((link) => link.getAttribute("aria-current") === "page")
    .map((link) => link.textContent);
