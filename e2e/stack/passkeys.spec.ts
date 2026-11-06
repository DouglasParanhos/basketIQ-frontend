/**
 * Passkeys end to end (spec 016) against the real backend and `pnpm dev`, with Chromium's virtual authenticator standing in
 * for the phone's lock. The RP ID is `localhost` (BASKETIQ_FRONTEND_BASE_URL=http://localhost:5173).
 */
import { expect, test } from "@playwright/test";
import { phoneWithPasskeys } from "../webauthn";
import { signInWithGoogle } from "./signIn";

test("F-220: a Google account adds a passkey, signs out and signs in again with it", async ({ page }) => {
  await phoneWithPasskeys(page);
  await signInWithGoogle(page, `passkey-${Date.now()}`);
  await page.goto("/definicoes/conta");
  const add = page.getByRole("button", { name: "Adicionar passkey neste telemóvel" });
  await expect(add).toBeEnabled();
  await add.click();
  await expect(page.getByText(/Passkey criada a/)).toBeVisible();
  await expect(page.getByText("Ainda não usada")).toBeVisible();

  await page.getByRole("button", { name: "Terminar sessão" }).click();
  await expect(page).toHaveURL(/\/login$/);
  const passkey = page.getByRole("button", { name: /Entrar com passkey/ });
  await expect(passkey).toBeEnabled();
  await passkey.click();
  await expect(page.getByRole("heading", { level: 1, name: "Início" })).toBeVisible();

  await page.goto("/definicoes/conta");
  await expect(page.getByText(/Último uso a/)).toBeVisible();
  // Removed, the login no longer offers it (F-223): only Google is left.
  await page.getByRole("button", { name: "Remover" }).click();
  await page.getByRole("button", { name: "Remover passkey" }).click();
  await expect(page.getByText(/Passkey criada a/)).toBeHidden();
  await page.getByRole("button", { name: "Terminar sessão" }).click();
  await expect(page.getByRole("link", { name: /Entrar com Google/ })).toBeVisible();
  await expect(passkey).toBeHidden();
});
