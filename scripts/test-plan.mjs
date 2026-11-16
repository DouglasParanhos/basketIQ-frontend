#!/usr/bin/env node
/**
 * The two test plans (spec 023). Both run every test; they differ in where the e2e tests run.
 *   node scripts/test-plan.mjs pwa       lint, typecheck, vitest, e2e mock + stack in desktop Chromium (`pnpm test:pwa`)
 *   node scripts/test-plan.mjs android   lint, typecheck, vitest, e2e mock + stack + smoke inside the Capacitor app's
 *                                        WebView on the Android emulator (`pnpm test:android`)
 * Both need the backend stack (../basketIQ-backend, `make up`). Playwright starts `pnpm dev` and the preview itself.
 */
import { spawnSync } from "node:child_process";

const CHECKS = ["pnpm lint", "pnpm typecheck", "pnpm test"];
const PLANS = {
  pwa: [...CHECKS, "pnpm e2e"],
  android: [...CHECKS, "pnpm android:emulator", "pnpm android:run", "pnpm e2e:android"],
};
const BACKEND = "http://localhost:8000/healthz";

const steps = PLANS[process.argv[2]];
if (!steps) {
  console.error(`Usage: node scripts/test-plan.mjs <${Object.keys(PLANS).join("|")}>`);
  process.exit(2);
}
if (!(await fetch(BACKEND).then((r) => r.ok, () => false))) {
  console.error(
    `The backend is not answering at ${BACKEND}: the stack tests need it.\n` +
      "Start it in WSL (cd ../basketIQ-backend && make up) and keep a WSL session open while testing.",
  );
  process.exit(1);
}
const started = Date.now();
for (const step of steps) {
  console.log(`\n> ${step}`);
  // A shell finds pnpm (pnpm.cmd on Windows).
  const { status } = spawnSync(step, { shell: true, stdio: "inherit" });
  if (status !== 0) {
    console.error(`\nFailed: ${step} (exit ${status})`);
    process.exit(status ?? 1);
  }
}
console.log(`\nAll ${process.argv[2]} steps passed in ${Math.round((Date.now() - started) / 1000)} s.`);
