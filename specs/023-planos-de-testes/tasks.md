---
description: "Tarefas da spec 023: dois planos de testes, PWA e emulador"
---

# Tasks: Dois planos de testes, PWA e emulador

**Input**: [spec.md](./spec.md), [plan.md](./plan.md)

**Estado (2026-11-15):** implementada; os dois planos correram de ponta a ponta.

- [X] T001 `scripts/test-plan.mjs` e scripts `test:pwa`, `test:android`; `pnpm dev` como `webServer` fora da CI (`F-364`)
- [X] T002 `e2e/fixtures.ts`, `playwright.android.config.ts` (projetos `android-mock`, `android-stack`, `android-smoke`); os specs importam `test` de `../fixtures`; o smoke da spec 022 passa a usar a fixture (`F-365`)
- [X] T003 O que a WebView não suporta: axe em `legacyMode`, viewport por CDP, câmara recusada, `test.skip(ON_DEVICE, motivo)` (`F-366`)
- [X] T004 Emulador com `-gpu swiftshader_indirect`; `adb reverse tcp:4173`
- [X] T005 README, `CLAUDE.md` local; `/simplify`

## Resultados (15/11/2026, emulador `basketiq-pixel7`, Android 16, WebView 133)

| Plano | Resultado | Duração |
|---|---|---|
| `pnpm test:android` | lint e typecheck sem erros; vitest 760/760; e2e no aparelho 222 passaram, 9 ignorados, 1 falhou (F-314) | 29,6 min |
| `pnpm test:pwa` | lint e typecheck sem erros; vitest 760/760; e2e no Chromium do PC 230 passaram, 1 falhou (F-314) | 6,9 min |

Ignorados no aparelho (9): os 6 testes de `e2e/mock/passkeys.spec.ts` e F-220 (sem WebAuthn na WebView), «SEC: another account cannot open my receipt» e F-146 (precisam de uma segunda página).

F-314 falha no aparelho em todas as execuções (no PC é intermitente): `getByText("Ovos classe M removido da lista.")` encontra o aviso visível e a região `role="status"` escondida (violação do modo estrito). É um defeito do teste, anterior a esta spec.
