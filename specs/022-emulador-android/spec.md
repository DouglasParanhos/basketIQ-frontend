# Feature Specification: Testar no emulador Android, com o app num shell nativo

**Feature Branch**: `feat/android-emulator`

**Created**: 2026-11-15

**Status**: Implementado e verificado no emulador a 15/11/2026.

**Input**: plano «testar o BasketIQ num emulador Android real» (15/11/2026). Decisões do dono: Capacitor a carregar o servidor de dev (Vite), não o build da loja; controlo por `adb` e pelo Playwright Android (experimental).

**Convenção de rastreabilidade:** F-360 a F-369 (Plano de Testes §5.1, faixa livre a seguir à F-350 a F-359).

**Âmbito:** só ferramentas de teste e shell de dev. Nenhum ficheiro de `src/` muda (princípio VIII).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - O app abre no emulador (Priority: P1)

1. **Given** o PC preparado, o emulador ligado (`pnpm android:emulator`) e `pnpm dev` a correr, **When** se corre `pnpm android:run`, **Then** o app abre no emulador e mostra a mesma app que no browser, em `http://localhost:5173`. — F-360

### User Story 2 - Um teste repetível no aparelho (Priority: P1)

1. **Given** o app instalado e o backend local a correr, **When** se corre `pnpm e2e:android`, **Then** o teste entra pelo mock OIDC, adiciona um talão sintético e chega ao ecrã de revisão. — F-361
2. **Given** o teste falha, **When** termina, **Then** o relatório traz o screenshot do aparelho e o logcat. — F-362

### User Story 3 - Saber o que falta no PC (Priority: P2)

1. **Given** um PC sem o toolchain, **When** se corre `scripts/android/setup.ps1`, **Then** o script lista cada item em falta e como o instalar, e não altera nada. — F-363

## Requirements *(mandatory)*

- **FR-001** A origem dentro do emulador é `http://localhost` (não `10.0.2.2`): `adb reverse` das portas 5173 (Vite e proxy `/v1`), 8080 (mock OIDC) e 9000 (storage, envio por URL pré-assinada). Assim o redirect do OIDC, os cookies first-party e a origem das passkeys ficam iguais aos do browser.
- **FR-002** O Vite escuta em `127.0.0.1` (`server.host`): o `adb reverse` só chega a IPv4, e `localhost` no Windows resolve para `::1`. O browser do PC continua a abrir `http://localhost:5173`.
- **FR-003** HTTP em claro só no build debug (`android/app/src/debug/AndroidManifest.xml`). O `server.url` do Capacitor só existe com `CAP_SERVER_URL` definido (o `android:run` define-o).
- **FR-004** Permissões: `INTERNET` e `CAMERA` (câmara não obrigatória no aparelho).
- **FR-005** `appId` provisório `app.basketiq.dev`. O definitivo é permanente na loja e é decisão do dono.
- **FR-006** Os projetos Playwright `mock` e `stack` não mudam.

## Fora do âmbito e lacunas conhecidas

- Build para a loja, assinatura, Play Store, iOS, push, CI com emulador.
- Passkeys na WebView (spec 016): não testadas aqui; continuam testadas no browser. Apps nativas precisarão de `assetlinks.json` e da origem `android:apk-key-hash`.
- Câmara: a câmara virtual do emulador mostra uma cena 3D; para talões usa-se o ficheiro (`setInputFiles` ou `adb push` para `/sdcard/Download`).
- Service worker: em dev o `vite-plugin-pwa` não regista SW (sem `devOptions`), por isso a WebView não serve versões antigas.

## Success Criteria

- US1 e US2 verificadas no emulador `basketiq-pixel7` (Android 16, API 36).
- `pnpm typecheck`, `pnpm lint`, `pnpm test` e `pnpm e2e:mock` continuam a passar.

## Identificadores de teste

| Id | Critérios | Teste |
|---|---|---|
| F-360 | US1.1 | manual: `pnpm android:run` + `adb exec-out screencap -p` |
| F-361, F-362 | US2.1, US2.2 | `e2e/android/smoke.spec.ts` |
| F-363 | US3.1 | manual: `scripts/android/setup.ps1` |
