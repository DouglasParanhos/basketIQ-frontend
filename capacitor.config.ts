import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Android shell for testing on an emulator (spec 022). Not the store build.
 * With CAP_SERVER_URL set (scripts/android/android.mjs `run` sets it to DEV_URL), the WebView loads the Vite dev
 * server; `adb reverse` keeps the origin at http://localhost so OIDC redirects, first-party cookies and passkey
 * origins behave as in the browser. Cleartext HTTP is allowed only in the debug build
 * (android/app/src/debug/AndroidManifest.xml), not here, so a release build never inherits it.
 */

// PROVISIONAL: the store appId is permanent and still to be decided by the owner.
export const APP_ID = "app.basketiq.dev";
export const DEV_URL = "http://localhost:5173";

const serverUrl = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: APP_ID,
  appName: "BasketIQ",
  webDir: "dist",
  ...(serverUrl && { server: { url: serverUrl } }),
};

export default config;
