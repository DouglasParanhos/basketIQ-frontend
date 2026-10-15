# BasketIQ — Frontend

Mobile-first PWA (React 19, TypeScript, Vite, Tailwind 4) for BasketIQ: photograph or upload a
supermarket receipt, review what was read, and see spending, products and price history.

Specification: `../Documentation/`. Feature specs and acceptance criteria with their tests:
`specs/` (spec-kit). API: `../Backend` (contract in `../Backend/openapi.json`).

## Screens

| Route | What it does |
|---|---|
| `/login` | "Entrar com Google" only (RF-01) |
| `/privacidade` | Privacy policy and consent (required before using the app) |
| `/` Resumo | Month/quarter/year/range, merchant and product filters, total and variation, spending chart with table alternative, share per merchant, top products |
| `/compras` | Receipts with status, filters, pagination |
| `/compras/:id` | Processing progress → review on a printed-receipt view (low-confidence values marked with a highlighter **and** text), edit/add/remove/split lines, totals check, confirm; duplicate and unknown-merchant decisions; view/delete original, delete purchase |
| `/adicionar` | Camera (`capture=environment`), image (JPEG/PNG/HEIC) or PDF; crop/rotate; optional merchant; SHA-256 duplicate check; upload with progress and resumable retry |
| `/produtos`, `/produtos/:id` | Search; weighted average price with explicit basis (per unit / kg / l), min/max, history, comparison between supermarkets |
| `/definicoes` | Account, sign-out, privacy, account deletion |
| `/operador` | Admin only: failed jobs and reprocessing, product metrics, per-merchant rules |

Design: azulejo cobalt on cool paper; the review screen is drawn as a thermal receipt
(Martian Mono, torn edge) — the one bold element. Fonts are self-hosted (no third-party requests).
Chart colours are validated for light and dark surfaces.

## Develop

Requirements: Node 22+, pnpm 9, the backend stack (`cd ../Backend && make up`).

```bash
pnpm install
pnpm dev            # http://localhost:5173 — /v1 is proxied to the API on :8000 (same-origin cookies)
pnpm gen:api        # regenerate src/api/schema.d.ts after backend API changes (make openapi there first)
```

Sign in locally through the mock OIDC server: type any user name (`admin` gets the operator role).

## Test

```bash
pnpm lint && pnpm typecheck
pnpm test                         # vitest + Testing Library + MSW (39 tests)
pnpm e2e:mock                     # Playwright, API faked with page.route: axe (WCAG 2.2 AA),
                                  # light + dark, 320–820 px without horizontal scroll, flows
pnpm e2e --project=stack          # full stack: mock OIDC login → upload PDF/photo → worker
                                  # (PaddleOCR) → review → confirm → dashboard → delete
```

The stack journey uses the backend's synthetic golden documents; it needs `make up` in `../Backend`
and `pnpm dev` running.

## Notes

- Session: HttpOnly cookies set by the API (BFF). The client sends the CSRF header and refreshes the
  session once on 401; with no session cookie it goes straight to sign-in.
- The service worker precaches the app shell only; `/v1` responses are never cached (personal data).
- HEIC photos are converted in the browser only for the preview/crop; unedited files are uploaded as is.
- Money is integer cents end to end; formatting is display-only (`src/lib/format.ts`).
