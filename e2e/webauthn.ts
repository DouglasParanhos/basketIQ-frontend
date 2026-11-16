import type { Page } from "@playwright/test";

/** Why the passkey specs skip in the Android app (spec 023): checked on the emulator, Android System WebView 133. */
export const NO_PASSKEYS_ON_DEVICE =
  "The Capacitor WebView has no WebAuthn (PublicKeyCredential is undefined) and no virtual authenticator (no CDP WebAuthn domain)";

/** A phone with a passkey-capable lock: Chromium's virtual authenticator (internal, user verification). Spec 016. */
export async function phoneWithPasskeys(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: { protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true, isUserVerified: true },
  });
}

/** A browser without WebAuthn: whether headless Chromium has a platform authenticator depends on the host. */
export async function noWebAuthn(page: Page) {
  await page.addInitScript(() => Reflect.deleteProperty(window, "PublicKeyCredential"));
}
