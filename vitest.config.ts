import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify("test") },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
    restoreMocks: true,
    // Above asyncUtilTimeout (4000 ms) so a test with two slow waits fails on the query, with its message, not on the clock.
    // Not covered: «Timeout calling "fetch"» (a worker waiting for the main process to load a module) when the whole run
    // is on a saturated machine; that is another limit, internal to vitest.
    testTimeout: 15000,
  },
});
