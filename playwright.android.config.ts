import { defineConfig } from "@playwright/test";
import { DEV_URL } from "./capacitor.config";
import base from "./playwright.config";

/**
 * The emulator test plan (spec 023, `pnpm e2e:android`): the same specs of e2e/mock and e2e/stack inside the
 * Capacitor debug app's WebView on a real Android emulator (e2e/fixtures.ts gives them its page), plus the smoke test
 * of spec 022. Needs the emulator and the installed app (`pnpm android:emulator`, `pnpm android:run`) and, for
 * android-stack and android-smoke, the backend stack. One device: one worker.
 */
process.env.BASKETIQ_ON_DEVICE = "1";

export default defineConfig({
  ...base,
  workers: 1,
  // One retry: about 1 test in 75 fails with `connect ETIMEDOUT 127.0.0.1:5037`, raised without a stack by Playwright's adb
  // client, so the fixture cannot catch it. A test that passes on the retry is listed as flaky in the report, not hidden.
  retries: 1,
  // Tracing hooks the contexts Playwright creates; the WebView's is not one. Failures attach a screenshot and logcat.
  use: { ...base.use, trace: "off" },
  projects: [
    { name: "android-mock", testMatch: /mock\/.*\.spec\.ts/, use: { baseURL: "http://localhost:4173" } },
    { name: "android-stack", testMatch: /stack\/.*\.spec\.ts/, use: { baseURL: DEV_URL } },
    { name: "android-smoke", testMatch: /android\/.*\.spec\.ts/, use: { baseURL: DEV_URL } },
  ],
});
