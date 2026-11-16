import { defineConfig } from "@playwright/test";

/**
 * A real Android emulator with the Capacitor debug app (spec 022, `pnpm e2e:android`). The tests drive the device's
 * WebView themselves (`_android`), so there are no browser options and no web server: the app loads `pnpm dev`.
 */
export default defineConfig({
  testDir: "./e2e/android",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: { trace: "retain-on-failure" },
});
