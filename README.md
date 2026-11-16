# BasketIQ — Frontend

Mobile-first PWA (React 19, TypeScript, Vite, Tailwind 4) for BasketIQ: photograph or upload a
supermarket receipt, review what was read, and see spending, products and price history.

Specification: `../Documentation/`. Feature specs and acceptance criteria with their tests:
`specs/` (spec-kit). API: `../basketIQ-backend` (contract in `../basketIQ-backend/openapi.json`).

## Screens

| Route | What it does |
|---|---|
| `/login` | "Entrar com Google" only (RF-01) |
| `/privacidade` | Privacy policy and consent (required before using the app) |
| `/` Início | Provisional home (title, "Adicionar talão", "Ver resumo") until spec 011; an old Resumo address (`/?de=…&ate=…`) redirects to `/compras/resumo` with the same filters |
| `/compras/resumo` | Resumo (tab of Talões): month/quarter/year/range, merchant and product filters, total and variation, spending chart with table alternative, share per merchant, top products |
| `/compras` | Compras (tab of Talões): receipts with status, filters, pagination |
| `/compras/:id` | Processing progress → review on a printed-receipt view (low-confidence values marked with a highlighter **and** text), edit/add/remove/split lines, totals check, confirm; duplicate and unknown-merchant decisions; view/delete original, delete purchase |
| `/adicionar` | Camera (`capture=environment`), image (JPEG/PNG/HEIC) or PDF; crop/rotate; optional merchant; SHA-256 duplicate check; upload with progress and resumable retry |
| `/produtos`, `/produtos/:id` | Search; weighted average price with explicit basis (per unit / kg / l), min/max, history, comparison between supermarkets |
| `/definicoes` | Account, sign-out, privacy, account deletion |
| `/operador` | Admin only: failed jobs and reprocessing, product metrics, per-merchant rules, read-only view of the product configuration |

## Product name and configuration

Customers see **"Super Mercado"**; BasketIQ is only the project name (repos, packages, docs).
The customer-facing name is **not** set in this repository. It is `APP_NAME_FOR_CUSTOMER` in
`../basketIQ-backend/config/app-config.yaml`, the single source of product decisions and feature flags
(see the Backend README). The app reads it at runtime:

- `GET /v1/config` (public) feeds the login screen, the settings footer and `document.title`
  (`src/config/appConfig.tsx`: `useAppName()`, `DocumentTitle`);
- the installed-app name comes from the manifest served by the backend, `GET /v1/config/manifest.webmanifest`
  (`<link rel="manifest">` in `index.html`; the build does not generate a manifest);
- `"Super Mercado"` in `appConfig.tsx` and in the `<title>` of `index.html` is only a fallback for the
  moment before the answer arrives or if the request fails.

To rename the product: edit the file in the backend and restart the API; no frontend rebuild.

Design: Super Mercado brand pack (deep teal, gold highlighter, mint; Nunito Sans). The review screen is
drawn as a thermal receipt (Martian Mono, torn edge) — the one bold element. Fonts are self-hosted (no
third-party requests). Tokens are in `src/styles.css`; the brand pack has no dark palette, so the dark
values are derived. Text/background pairs are kept at >= 4.5:1 (graphics and focus ring >= 3:1); the
brand's vivid green is never used for text. App icons: `node scripts/make_icons.mjs` regenerates
`public/icons/` from the brand icon (needs Playwright's Chromium).

## Develop

Requirements: Node 24+, pnpm 9, the backend stack (`cd ../basketIQ-backend && make up`).

```bash
pnpm install
pnpm dev            # http://localhost:5173 — /v1 is proxied to the API on :8000 (same-origin cookies)
pnpm gen:api        # regenerate src/api/schema.d.ts after backend API changes (make openapi there first)
```

Sign in locally through the mock OIDC server: type any user name (`admin` gets the operator role).

## Test

Two test plans (spec 023). Both run every test and need the backend stack (`make up` in
`../basketIQ-backend`); they stop at once with a message if it is down. Playwright starts `pnpm dev` and
the preview itself.

```bash
pnpm test:pwa       # after every change: lint, typecheck, vitest, e2e mock + stack in desktop Chromium
pnpm test:android   # before calling a feature ready for the phone: the same checks, then every e2e test
                    # (mock, stack, smoke) inside the app's WebView on the Android emulator
```

The steps one by one:

```bash
pnpm lint && pnpm typecheck
pnpm test                         # vitest + Testing Library + MSW (45 tests)
pnpm e2e:mock                     # Playwright, API faked with page.route: axe (WCAG 2.2 AA),
                                  # light + dark, 320–820 px without horizontal scroll, flows
pnpm e2e --project=stack          # full stack: mock OIDC login → upload PDF/photo → worker
                                  # (PaddleOCR) → review → confirm → dashboard → delete
```

The stack journey uses the backend's synthetic golden documents; it needs `make up` in `../basketIQ-backend`
and `pnpm dev` running. In CI it runs only on pull requests (job `e2e-stack`), against the backend's
`main` branch.

### Android emulator (spec 022)

The app runs in a Capacitor debug shell (`android/`) that loads the Vite dev server, on a real Android
emulator. Not the store build. `adb reverse` keeps the origin at `http://localhost` (ports 5173, 8080,
9000 and 4173), so sign-in, cookies and uploads behave as in the browser.

```bash
powershell -ExecutionPolicy Bypass -File scripts/android/setup.ps1   # what is missing (JDK 21, SDK, AVD); changes nothing
pnpm android:emulator             # boots the basketiq-pixel7 AVD without a window
pnpm dev                          # Vite on 127.0.0.1:5173 (IPv4: adb reverse reaches nothing else)
pnpm android:run                  # cap sync + installDebug + adb reverse + open the app
pnpm e2e:android                  # every e2e test in the app's WebView (projects android-mock,
                                  # android-stack, android-smoke)
adb exec-out screencap -p > screen.png   # see the screen
```

Also needs the backend stack (`make up` in `../basketIQ-backend`; with Docker in WSL, keep a WSL session
open or the containers stop). The `appId` `app.basketiq.dev` is provisional.

`pnpm e2e:android` runs the specs of `e2e/mock` and `e2e/stack` unchanged: `e2e/fixtures.ts` gives them the
WebView's page, with the app's data cleared before each test (`pm clear`), the camera permission refused
(a test that needs a camera fakes one) and `setViewportSize` done through CDP. On a failure the report has
the device's screenshot and logcat. Skipped on the device, with the reason in the report: the passkey specs
(the WebView has no WebAuthn), «SEC: another account cannot open my receipt» and F-146 (both need a second
page). The emulator runs with a software GPU (`-gpu swiftshader_indirect`): with the host GPU, axe over the
in-app camera dropped the adb connection.

## Notes

- Session: HttpOnly cookies set by the API (BFF). The client sends the CSRF header and refreshes the
  session once on 401; with no session cookie it goes straight to sign-in.
- The service worker precaches the app shell only; `/v1` responses are never cached (personal data).
- HEIC photos are converted in the browser only for the preview/crop; unedited files are uploaded as is.
- Money is integer cents end to end; formatting is display-only (`src/lib/format.ts`).
