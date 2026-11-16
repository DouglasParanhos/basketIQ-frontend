# Implementation Plan: Dois planos de testes, PWA e emulador

**Branch**: `feat/planos-de-testes` | **Date**: 2026-11-15 | **Spec**: [spec.md](./spec.md)

## Summary

Um script Node (`scripts/test-plan.mjs`) corre cada plano passo a passo e falha logo se o backend não responde. O plano emulador reutiliza os specs de `e2e/mock` e `e2e/stack` sem os duplicar: os specs importam `test` de `e2e/fixtures.ts`, que, só quando `playwright.android.config.ts` o pede, troca a fixture `page` pela página da WebView do app no emulador.

## Design

| Peça | Ficheiro | Notas |
|---|---|---|
| Planos | `scripts/test-plan.mjs`, `package.json` (`test:pwa`, `test:android`) | Verifica `http://localhost:8000/healthz` antes de tudo. Para no primeiro passo que falha. |
| Servidor de dev | `playwright.config.ts` | Novo `webServer` `pnpm dev` (5173) fora da CI, reutilizado se já corre. A CI arranca o seu (`ci.yml`). |
| Fixture do aparelho | `e2e/fixtures.ts` | Reexporta `@playwright/test`. Com `BASKETIQ_ON_DEVICE=1`: `device` por worker; `page` por teste com `pm clear`, câmara recusada (`pm set-permission-flags … user-fixed`), arranque do app, ligação à WebView pelo pid, `goto` relativo ao `baseURL`, locale e fuso por CDP, `setViewportSize`/`viewportSize` por `Emulation.setDeviceMetricsOverride` com `mobile: true` (o do Playwright não muda nada na WebView). Screenshot e logcat em falha. |
| Configuração do aparelho | `playwright.android.config.ts` | Herda a do PC (servidores, timeouts, locale). Um worker, sem retries, sem trace. Projetos `android-mock` (4173), `android-stack` (5173), `android-smoke`. |
| axe | `e2e/mock/a11y.ts` | `setLegacyMode(ON_DEVICE)`. |
| Emulador | `scripts/android/android.mjs` | `-gpu swiftshader_indirect`; `adb reverse` também da 4173. |
| Specs | `e2e/mock/*.spec.ts`, `e2e/stack/*.spec.ts` | O import muda; mais os `test.skip(ON_DEVICE, motivo)`, as caixas «Compreendo…» tocadas pelo `label` e meio pixel de tolerância em medidas exatas da barra e do rodapé (spec FR-003b). |

## Alternativas rejeitadas

- **Chrome do emulador** (`device.launchBrowser()`): teria contextos e páginas novas, mas não é a WebView do app.
- **Duplicar os specs para o aparelho**: duas cópias a divergir.
- **Limpar estado sem reiniciar o app**: `context.clearCookies()` não funciona na WebView («Browser context management is not supported») e os init scripts de um teste ficariam para o seguinte.

## Constitution Check

- VIII (simples): nenhum ficheiro de `src/` muda; nenhuma dependência nova.
