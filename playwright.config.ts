import { defineConfig, devices } from "@playwright/test";

/**
 * Two projects:
 * - mock:  the built PWA with the API intercepted (page.route). Runs in CI, no backend needed.
 *          Covers accessibility (axe), responsive widths and UI flows.
 * - stack: end-to-end against the real backend (docker compose up in ../Backend) with the
 *          mock OIDC server. Run locally: `pnpm e2e --project=stack`.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { trace: "retain-on-failure", locale: "pt-PT", timezoneId: "Europe/Lisbon" },
  projects: [
    {
      name: "mock",
      testMatch: /mock\/.*\.spec\.ts/,
      use: { ...devices["Pixel 7"], baseURL: "http://localhost:4173", serviceWorkers: "block" },
    },
    {
      name: "stack",
      testMatch: /stack\/.*\.spec\.ts/,
      use: { ...devices["Pixel 7"], baseURL: "http://localhost:5173", serviceWorkers: "block" },
    },
  ],
  webServer: [
    {
      command: "pnpm build && pnpm preview --port 4173 --strictPort",
      url: "http://localhost:4173",
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
