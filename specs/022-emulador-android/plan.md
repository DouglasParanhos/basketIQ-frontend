# Implementation Plan: Testar no emulador Android, com o app num shell nativo

**Branch**: `feat/android-emulator` | **Date**: 2026-11-15 | **Spec**: [spec.md](./spec.md)

## Summary

Capacitor 8 como shell Android de dev a carregar o Vite por `http://localhost:5173` (via `adb reverse`), um script Node para arrancar o emulador e instalar o app, um projeto Playwright `android` com `_android` e um `setup.ps1` que só verifica.

## Technical Context

**Primary Dependencies**: `@capacitor/core`, `@capacitor/android`, `@capacitor/cli` 8.6.2 (exige JDK 21, `compileSdk`/`targetSdk` 36). Nada entra no bundle da app.
**Testing**: Playwright `_android` (experimental): ligou à WebView sem problemas; o plano B (`uiautomator dump`) não foi preciso.
**Target Platform**: emulador Android 16 (API 36, `google_apis`, x86_64) com WHPX no Windows. Backend no Docker do WSL.

## Design

| Peça | Ficheiro | Notas |
|---|---|---|
| Configuração | `capacitor.config.ts` | `webDir: dist`; `server.url` só com `CAP_SERVER_URL`. |
| Projeto Android | `android/` | Gerado por `cap add android`. Muda: `CAMERA` no manifest principal; `src/debug/AndroidManifest.xml` com `usesCleartextTraffic`. Inspeção remota da WebView já ligada em debug pelo Capacitor. |
| Scripts | `scripts/android/android.mjs` | `emulator` (sem janela) e `run` (sync, `installDebug`, `adb reverse`, abrir). Node para correr igual em PowerShell e Git Bash. |
| Verificação do PC | `scripts/android/setup.ps1` | Só lê; sai com 1 se faltar algo. |
| Vite | `vite.config.ts` | `server.host: 127.0.0.1`; o watcher ignora `android/` (o Gradle copia a app para lá e provocava reloads). |
| Teste | `e2e/android/smoke.spec.ts`, `playwright.android.config.ts`, `e2e/stack/receipts.ts`, `e2e/stack/signIn.ts` | Config própria, sem servidor web (o app carrega o `pnpm dev`). Reutiliza o login e o envio do `stack` com uma origem explícita. `APP_ID` e `DEV_URL` vêm de `capacitor.config.ts`. |

## Constitution Check

- VIII (simples): nenhum ficheiro de `src/` muda; sem plugins Capacitor.
