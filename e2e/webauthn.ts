import type { Page } from "@playwright/test";

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
