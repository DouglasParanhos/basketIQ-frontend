import { expect, test } from "@playwright/test";
import { phoneWithPasskeys } from "../webauthn";
import { noA11yViolations } from "./a11y";
import { fakeApi } from "./api";

// The passkey screens of spec 016 in both colour schemes at the narrowest width of the plan (§10, §11).
for (const scheme of ["light", "dark"] as const) {
  test.describe(`passkeys (spec 016, ${scheme}, 320px)`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width: 320, height: 800 });
      await phoneWithPasskeys(page);
    });

    test("F-216: the login with «Entrar com passkey» has no axe violations", async ({ page }) => {
      await fakeApi(page, { signedIn: false, passkeys: true });
      await page.goto("/login");
      await expect(page.getByRole("button", { name: /Entrar com passkey/ })).toBeEnabled();
      await noA11yViolations(page);
    });

    test("F-218: the Início with the passkey offer has no axe violations", async ({ page }) => {
      await fakeApi(page, { passkeys: true });
      await page.goto("/");
      await expect(page.getByRole("heading", { name: "Entrar mais depressa" })).toBeVisible();
      await page.waitForLoadState("networkidle");
      await noA11yViolations(page);
    });

    test("F-217: Conta with «Adicionar passkey neste telemóvel» has no axe violations and 44 px targets", async ({ page }) => {
      await fakeApi(page, { passkeys: true });
      await page.goto("/definicoes/conta");
      const add = page.getByRole("button", { name: "Adicionar passkey neste telemóvel" });
      await expect(add).toBeEnabled();
      expect((await add.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
      await noA11yViolations(page);
    });
  });
}
