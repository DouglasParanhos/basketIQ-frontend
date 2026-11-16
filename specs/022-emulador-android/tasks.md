---
description: "Tarefas da spec 022: testar no emulador Android"
---

# Tasks: Testar no emulador Android, com o app num shell nativo

**Input**: [spec.md](./spec.md), [plan.md](./plan.md)

**Estado (2026-11-15):** implementada e verificada no emulador.

- [X] T001 PC: WHPX ativo, JDK 21, Android SDK (platform-tools, emulator, platforms;android-36, imagem API 36), AVD `basketiq-pixel7`
- [X] T002 Capacitor 8 + `capacitor.config.ts` + manifests (CAMERA; cleartext só em debug)
- [X] T003 `scripts/android/android.mjs` e scripts `android:emulator`, `android:run`, `e2e:android`; Vite em 127.0.0.1 (`F-360`)
- [X] T004 `scripts/android/setup.ps1` (`F-363`)
- [X] T005 `e2e/android/smoke.spec.ts` e projeto `android` (`F-361`, `F-362`)
- [X] T006 `CLAUDE.md` e `README.md`; Plano de Testes §5.1 (faixa F-360 a F-369)
- [X] T007 `lint`, `typecheck`, `vitest`, `e2e:mock`; `/simplify`
