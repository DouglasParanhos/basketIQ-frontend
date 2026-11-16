/**
 * Smoke test on a real Android emulator (spec 022): the Capacitor debug app loading the Vite dev server.
 * Needs: `pnpm android:emulator`, `pnpm dev`, the backend stack (cd ../basketIQ-backend && make up)
 * and `pnpm android:run`. Playwright's Android support is experimental (`_android`).
 */
import { _android as android, expect, test, type AndroidDevice, type Page } from "@playwright/test";
import { APP_ID, DEV_URL } from "../../capacitor.config";
import { doc, upload } from "../stack/receipts";
import { signInWithGoogle } from "../stack/signIn";

let device: AndroidDevice;
let page: Page;

test.beforeAll(async () => {
  [device] = await android.devices();
  if (!device) throw new Error("No Android device: start one with `pnpm android:emulator`.");
  await device.shell("logcat -c");
  // A fresh start: stops the app and clears its data, including the session cookie of a previous run.
  await device.shell(`pm clear ${APP_ID}`);
  await device.shell(`am start -W -n ${APP_ID}/.MainActivity`);
  page = await (await device.webView({ pkg: APP_ID })).page();
});

// Playwright needs the fixtures argument destructured; asking for none keeps it from launching a browser.
// eslint-disable-next-line no-empty-pattern
test.afterEach(async ({}, info) => {
  if (info.status === info.expectedStatus) return;
  await info.attach("screen.png", { body: await device.screenshot(), contentType: "image/png" });
  await info.attach("logcat.txt", { body: await device.shell("logcat -d -t 2000"), contentType: "text/plain" });
});

test.afterAll(async () => device?.close());

test("F-361: sign in, add a receipt and reach the review on the device", async () => {
  test.setTimeout(180_000);
  await signInWithGoogle(page, `android-${Date.now()}`, DEV_URL);
  // The file picker itself is not under test: the file goes straight into the input.
  await upload(page, doc("pingo_doce_mismatch"), "input-pdf", DEV_URL);
  await expect(page.getByText("Reveja antes de confirmar")).toBeVisible({ timeout: 60_000 });
});
