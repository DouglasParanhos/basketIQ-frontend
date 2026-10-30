import { screen, within } from "@testing-library/react";

export const NAV_NAME = "Navegação principal";
export const nav = () => screen.getByRole("navigation", { name: NAV_NAME });

/** Labels of the bottom-navigation destinations marked as the current page. */
export const currentDestinations = () =>
  within(nav())
    .getAllByRole("link")
    .filter((link) => link.getAttribute("aria-current") === "page")
    .map((link) => link.textContent);
