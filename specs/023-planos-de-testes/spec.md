# Feature Specification: Dois planos de testes, PWA e emulador

**Feature Branch**: `feat/planos-de-testes` (a partir de `feat/android-emulator`, spec 022, ainda não integrada no `main`)

**Created**: 2026-11-15

**Status**: Implementado e verificado a 15/11/2026.

**Input**: pedido do dono: «A aplicação deve ter 2 planos de testes. Um que teste quando a modificação for feita, localmente mesmo, com o PWA, deve rodar todos os testes, mas como PWA e outro que também rode todos os testes mas rode diretamente no emulador para ter maior certeza que vai funcionar em um celular de verdade.»

**Convenção de rastreabilidade:** F-364 a F-366 (faixa F-360 a F-369 da spec 022).

**Âmbito:** só ferramentas de teste. Nenhum ficheiro de `src/` muda; sem dependências novas.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Plano PWA, a cada modificação (Priority: P1)

1. **Given** o backend local a correr, **When** se corre `pnpm test:pwa`, **Then** correm lint, typecheck, vitest e todos os e2e (`mock` e `stack`) no Chromium do PC; o `pnpm dev` e o preview arrancam sozinhos. — F-364
2. **Given** o backend parado, **When** se corre um dos planos, **Then** falha logo, antes de qualquer passo, com uma mensagem que diz como o subir. — F-364

### User Story 2 - Plano emulador, antes de dar uma funcionalidade por pronta para o telemóvel (Priority: P1)

1. **Given** o backend local e o toolchain Android, **When** se corre `pnpm test:android`, **Then** correm lint, typecheck e vitest no PC, o emulador arranca (se preciso), o app é instalado e todos os e2e (`mock`, `stack` e o smoke da spec 022) correm dentro da WebView do app no emulador, não num Chromium do PC. — F-365
2. **Given** um teste que precisa de algo que a WebView não tem, **When** corre no plano emulador, **Then** aparece como ignorado com o motivo no relatório; continua a correr no plano PWA. — F-366

## Requirements *(mandatory)*

- **FR-001** Os specs de `e2e/mock` e `e2e/stack` são os mesmos nos dois planos. Importam `test` de `e2e/fixtures.ts`; com `BASKETIQ_ON_DEVICE=1` (definido por `playwright.android.config.ts`) a fixture `page` é a página da WebView do app (`_android`).
- **FR-002** Isolamento: antes de cada teste, `pm clear` do app e novo arranque (≈2 s). Limpa cookies, storage e service worker e, porque a ligação CDP é nova, init scripts, rotas e emulação.
- **FR-003** URLs relativos resolvem contra o `baseURL` do projeto: `android-mock` → `http://localhost:4173` (preview, `adb reverse tcp:4173`), `android-stack` → `http://localhost:5173`. Locale `pt-PT` e fuso `Europe/Lisbon` por CDP, como nos projetos do PC.
- **FR-003a** `setViewportSize` no aparelho é feito por CDP (`Emulation.setDeviceMetricsOverride`, `mobile: true`, a densidade do aparelho): o do Playwright não muda a WebView. A câmara fica recusada sem pedido do sistema (`pm set-permission-flags … user-fixed`), como no Chromium headless sem câmara; os testes da câmara na app falseiam-na (`e2e/mock/fakeCamera.ts`).
- **FR-003b** Ajustes nos specs, válidos nos dois planos: as caixas «Compreendo…» (`AcknowledgeBox`) são tocadas pela caixa visível (o `label`), não pelo `input` escondido forçado, que no aparelho caía 0,5 px fora do `label`; três medidas exatas da barra de navegação e do rodapé da política passam a ter tolerância de meio pixel (num telemóvel a borda de 1 px ocupa píxeis inteiros do aparelho: 0,76 px CSS a 2,625).
- **FR-004** O axe corre em `legacyMode` no aparelho: a WebView não abre a página em branco onde o axe termina a análise.
- **FR-005** O emulador arranca com `-gpu swiftshader_indirect`: com a GPU do host, o axe sobre a câmara na app bloqueava o emulador e a ligação adb caía (com ela, as portas do `adb reverse`).
- **FR-006** Falha no aparelho: o relatório traz o screenshot do ecrã e o logcat.

## Testes que não correm no emulador

| Teste | Motivo |
|---|---|
| `e2e/mock/passkeys.spec.ts` (todos) e `e2e/stack/passkeys.spec.ts` (F-220) | A WebView do Capacitor não tem WebAuthn (`PublicKeyCredential` indefinido) nem autenticador virtual (sem domínio CDP `WebAuthn`). |
| `stack/journey.spec.ts` «SEC: another account cannot open my receipt» | Precisa de duas sessões ao mesmo tempo; a WebView tem um só cookie jar e não abre outra página. |
| `mock/ui.spec.ts` F-146 | Abre uma segunda página com outra API falsa; a WebView não abre outra página. |

## Fora do âmbito e lacunas conhecidas

- **Passkeys no app nativo não funcionam hoje**: sem WebAuthn, o app trata a WebView como um browser sem passkeys (`usePasskeySupport` dá falso) e não as oferece; o login com Google continua. Ativar exige trabalho nativo (`androidx.webkit` com suporte WebAuthn ou um plugin de Credential Manager, mais `assetlinks.json`). Decisão do dono.
- CI com emulador.
- O teste mock F-314 (lista de compras) é intermitente também no `main`.

## Success Criteria

Ver [tasks.md](./tasks.md), secção «Resultados».

## Identificadores de teste

| Id | Critérios | Teste |
|---|---|---|
| F-364 | US1.1, US1.2 | `pnpm test:pwa` |
| F-365 | US2.1 | `pnpm test:android` |
| F-366 | US2.2 | `test.skip(ON_DEVICE, motivo)` nos specs da tabela acima |
