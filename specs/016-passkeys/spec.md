# Feature Specification: Entrar com passkey (UI)

**Feature Branch**: `feature/passkeys`

**Created**: 2026-11-04

**Status**: Implemented (Vitest, lint, typecheck, e2e mock e o percurso stack F-220 verdes; teste manual em Android e iPhone por fazer)

**Input**: Especificação Funcional RF-01 (alterado em 04/11/2026), §8; Plano de Testes F-03a e faixa das passkeys (§5.1). Backend: `../basketIQ-backend/specs/016-passkeys` (`contracts/api.md`).

**Convenção de rastreabilidade**: os testes levam o identificador no nome (`F-xx: …`). Identificadores **F-216 a F-221**. O backend verifica F-206 a F-215.

## Clarifications

### Session 2026-11-04

Decisões do Douglas, 2026-11-04.

- Q: Quem vê «Entrar com passkey»? → A: só um telemóvel (ou browser) com autenticador da plataforma (`platformAuthenticatorIsAvailable`). Os outros veem só «Entrar com Google».
- Q: Onde se regista? → A: em Definições › Conta, e numa oferta única no Início. A dispensa guarda-se no servidor (`passkey_offer_dismissed`), nunca em `localStorage`.
- Q: A oferta aparece numa conta sem compras? → A: **não**. Aí o aviso «A aguardar o seu primeiro talão» cobre o Início; a oferta espera pela primeira compra. As Definições continuam disponíveis.
- Q: Como funciona no iPhone? → A: o Safari só abre o Face ID quando a chamada WebAuthn acontece dentro do toque. As opções pedem-se quando o ecrã abre e renovam-se a cada 4 minutos (o challenge vale 5); o toque chama `navigator.credentials.get/create` sem pedido pelo meio.
- Q: Que biblioteca? → A: `@simplewebauthn/browser` 14.0.0, que converte base64url e lida com browsers sem `parse*FromJSON`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Entrar com passkey (Priority: P1)

1. **Given** um telemóvel que permite passkeys, **When** a pessoa toca em «Entrar com passkey» e confirma com a digital, o rosto ou o PIN, **Then** entra e vê o Início. — F-216
2. **Given** um browser sem passkeys, **Then** só aparece «Entrar com Google» e nenhum pedido é feito. — F-216, F-03a
3. **Given** a pessoa cancela, a passkey já não é válida, ou há demasiadas tentativas, **Then** uma mensagem clara e continua no login. — F-216
4. **Given** o ecrã de login aberto, **When** toca no botão, **Then** o pedido ao telemóvel acontece sem nenhum pedido à API pelo meio. — F-219

### User Story 2 - Gerir as passkeys nas Definições (Priority: P1)

1. **Given** passkeys registadas, **Then** listam-se com a data de criação e de último uso («Ainda não usada»); «Remover» pede confirmação. — F-217
2. **Given** um telemóvel que permite, **When** toca em «Adicionar passkey neste telemóvel», **Then** a passkey é criada e aparece na lista. — F-217
3. **Given** o telemóvel já tem uma passkey desta conta, **Then** «Este telemóvel já tem uma passkey desta conta.»; se a pessoa cancelar, nada aparece. — F-217
4. **Given** um dispositivo sem passkeys, **Then** a lista continua e diz «Este dispositivo não permite criar passkeys.». — F-217
5. **Given** «Eliminar conta», **Then** a lista do que desaparece inclui «As passkeys registadas». — F-217

### User Story 3 - Oferta única no Início (Priority: P2)

1. **Given** um telemóvel que permite, uma conta sem passkeys, com compras, e a oferta por dispensar, **Then** aparece «Entrar mais depressa» com «Ativar» e «Agora não». — F-218
2. **When** «Agora não», **Then** `PATCH /v1/me/profile {"passkey_offer_dismissed": true}` e a oferta sai. **When** «Ativar», **Then** a passkey é criada, a dispensa é guardada e a oferta sai. — F-218
3. **Given** a oferta já dispensada, uma passkey já registada, um telemóvel sem passkeys ou uma conta sem compras, **Then** não há oferta. — F-218

### Percurso completo

- Conta Google → «Adicionar passkey neste telemóvel» → «Terminar sessão» → «Entrar com passkey» → Início → «Último uso» → «Remover» → a passkey é recusada. Contra o backend real, com o autenticador virtual do Chromium. — F-220 · `e2e/stack/passkeys.spec.ts`

### Teste manual (F-221)

No Xiaomi (Chrome, Android) e num iPhone (Safari), no browser e com a PWA instalada no ecrã inicial, pelo `https://192-168-1-80.sslip.io:5173` (IP não serve como RP ID):

1. Entrar com Google; registar a passkey (digital no Android, Face ID no iPhone).
2. Terminar sessão; entrar com a passkey. No iPhone, o primeiro toque abre logo o Face ID.
3. Remover a passkey; confirmar que deixa de entrar. Eliminar a conta.
4. Registar se o login Google funciona dentro da PWA instalada no iPhone (cookies separados do Safari). Se falhar, é uma pendência à parte.

## Requirements *(mandatory)*

- **FR-001**: «Entrar com passkey» MUST aparecer só com autenticador da plataforma; nenhum outro método além de Google.
- **FR-002**: As opções MUST ser pedidas antes do toque e renovadas antes de expirarem; o toque MUST chamar o WebAuthn sem pedido pelo meio.
- **FR-003**: Nada MUST ir para `localStorage` ou `sessionStorage`; a dispensa da oferta vai para o servidor.
- **FR-004**: Textos em pt-PT, sem «você»; alvos ≥ 44 px; sem violações axe em claro e escuro. — F-216 a F-218 · `e2e/mock/passkeys.spec.ts`

## Identificadores de teste

| ID | Cenário | Onde |
|---|---|---|
| F-216 | Botão de entrada, suporte, erros | `src/features/auth/passkeys.test.tsx`, `e2e/mock/passkeys.spec.ts` |
| F-217 | Cartão nas Definições, eliminar conta | `src/features/auth/passkeys.test.tsx`, `e2e/mock/passkeys.spec.ts` |
| F-218 | Oferta única no Início | `src/features/auth/passkeys.test.tsx`, `e2e/mock/passkeys.spec.ts` |
| F-219 | Opções antes do toque (iPhone) | `src/features/auth/passkeys.test.tsx` |
| F-220 | Percurso completo contra o backend | `e2e/stack/passkeys.spec.ts` |
| F-221 | Teste manual Android e iPhone | este documento |
