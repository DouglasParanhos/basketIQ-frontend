import { expect, type Page } from "@playwright/test";

/** A new account through the local mock OIDC server (Google in staging/production): consent, skipped onboarding, Início. */
export async function signInWithGoogle(page: Page, subject: string) {
  await page.goto("/login");
  await page.getByRole("link", { name: "Entrar com Google" }).click();
  await page.getByPlaceholder("Enter any user/subject").fill(subject);
  await page.getByRole("button", { name: "Sign-in" }).click();
  await expect(page).toHaveURL(/\/privacidade$/);
  await page.getByRole("button", { name: "Li a política e continuar" }).click();
  // A new account goes through the onboarding (spec 010) before anything else: skip the four steps.
  await expect(page).toHaveURL(/\/boas-vindas$/);
  for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Saltar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Tudo pronto" })).toBeVisible();
  await page.getByRole("link", { name: "Ver o início" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Início" })).toBeVisible();
}
