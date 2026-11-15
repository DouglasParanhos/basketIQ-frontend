import { _android as android, test as base, type AndroidDevice, type Locator, type Page } from "@playwright/test";
import { APP_ID } from "../capacitor.config";

// Everything the specs import from Playwright; `test` below takes precedence over its namesake.
export * from "@playwright/test";

/**
 * Set by playwright.android.config.ts (spec 023): the same specs run inside the Capacitor app's WebView on the Android
 * emulator instead of a desktop Chromium. Only `page` changes; a test that needs what the WebView lacks skips with the reason.
 * Adapted on the device: `goto` (relative to baseURL), `setViewportSize`/`viewportSize`, locale and timezone. Not adapted:
 * other relative URLs (`waitForURL("/x")`, string `toHaveURL`), new pages or contexts, `page.request`.
 */
export const ON_DEVICE = process.env.BASKETIQ_ON_DEVICE === "1";

/** Ticks a drawn checkbox as a person does, by its label: the real input is visually hidden (`sr-only`). */
export const tick = (scope: Page | Locator) => scope.locator("label:has(input[type=checkbox])").click();

const onDevice = base.extend<object, { device: AndroidDevice }>({
  device: [
    // eslint-disable-next-line no-empty-pattern -- Playwright needs the fixtures argument destructured
    async ({}, provide) => {
      const [device] = await android.devices();
      if (!device) throw new Error("No Android device: start one with `pnpm android:emulator`.");
      await provide(device);
      await device.close();
    },
    { scope: "worker" },
  ],
  page: async ({ device, baseURL, locale, timezoneId }, provide, info) => {
    // A fresh app for every test: no cookies, storage, service worker, init scripts, routes or emulation left over.
    // Like headless Chromium, no camera unless a test fakes one: refused without the system prompt, which would wait.
    // One adb round trip; its output is the new app's pid.
    const pid = (
      await device.shell(
        `pm clear ${APP_ID} && pm set-permission-flags ${APP_ID} android.permission.CAMERA user-fixed && logcat -c && ` +
          `am start -W -n ${APP_ID}/.MainActivity >/dev/null && pidof ${APP_ID}`,
      )
    )
      .toString()
      .trim();
    const page = await (await device.webView({ pkg: APP_ID, socketName: `webview_devtools_remote_${pid}` })).page();
    // The desktop projects' `serviceWorkers: "block"`, which a persistent context ignores: without it the preview build
    // registers the PWA's service worker and later loads come from its precache. The app skips registering when
    // `navigator.serviceWorker` is missing (virtual:pwa-register). Applies from the test's first `goto`.
    await page.addInitScript(() => Reflect.deleteProperty(Navigator.prototype, "serviceWorker"));
    // Playwright did not create the WebView's context, so it has no baseURL: `goto("/x")` resolves against the project's.
    const goto = page.goto.bind(page);
    page.goto = (url, options) => goto(new URL(url, baseURL).href, options);
    // The desktop projects' locale and timezone (playwright.config.ts `use`), which a persistent context ignores.
    const cdp = await page.context().newCDPSession(page);
    if (locale) await cdp.send("Emulation.setLocaleOverride", { locale });
    if (timezoneId) await cdp.send("Emulation.setTimezoneOverride", { timezoneId });
    // Playwright's setViewportSize changes nothing in a WebView; the same CDP call with `mobile` (a phone's viewport) does.
    let viewport: { width: number; height: number } | null = null;
    page.setViewportSize = async (size) => {
      await cdp.send("Emulation.setDeviceMetricsOverride", { ...size, deviceScaleFactor: 0, mobile: true });
      viewport = size;
    };
    page.viewportSize = () => viewport;
    await provide(page);
    if (info.status === info.expectedStatus) return;
    const [screen, logcat] = await Promise.all([device.screenshot(), device.shell("logcat -d -t 2000")]);
    await info.attach("screen.png", { body: screen, contentType: "image/png" });
    await info.attach("logcat.txt", { body: logcat, contentType: "text/plain" });
  },
});

export const test = (ON_DEVICE ? onDevice : base) as typeof base;
