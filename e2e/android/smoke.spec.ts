/**
 * Smoke test on a real Android emulator (spec 022): the Capacitor debug app loading the Vite dev server, through the
 * device fixture of e2e/fixtures.ts (spec 023). Run by `pnpm e2e:android`, project android-smoke.
 */
import { expect, test } from "../fixtures";
import { doc, upload } from "../stack/receipts";
import { signInWithGoogle } from "../stack/signIn";

test("F-361: sign in, add a receipt and reach the review on the device", async ({ page }) => {
  test.setTimeout(180_000);
  await signInWithGoogle(page, `android-${Date.now()}`);
  // The file picker itself is not under test: the file goes straight into the input.
  await upload(page, doc("pingo_doce_mismatch"));
  await expect(page.getByText("Reveja antes de confirmar")).toBeVisible({ timeout: 60_000 });
});
