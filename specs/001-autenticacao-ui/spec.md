# Feature Specification: Autenticação e consentimento (UI)

**Feature Branch**: `001-autenticacao-ui`

**Created**: 2026-10-15

**Status**: Implemented

**Input**: Especificação Funcional RF-01, §4.1, §8; Plano de Testes F-01..F-03a. Backend: `../Backend/specs/001-autenticacao`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Entrar com Google pela primeira vez (Priority: P1)

A pessoa abre a aplicação, vê um único botão "Entrar com Google", autentica-se, aceita a política de
privacidade e chega ao resumo.

**Why this priority**: Sem sessão não há nenhuma outra funcionalidade.

**Independent Test**: Página de login isolada com a API simulada; percurso real contra o backend com o OIDC de teste.

**Acceptance Scenarios**:

1. **Given** uma pessoa sem sessão, **When** abre `/login`, **Then** vê apenas "Entrar com Google" (ligação para `/v1/auth/login`), sem campos de e-mail ou palavra-passe. — F-03a — `src/features/features.test.tsx › login (RF-01) › F-03a: offers Google as the only sign-in method`; `e2e/mock/ui.spec.ts › accessibility (plano de testes §10) › login has no axe violations`
2. **Given** um primeiro acesso autenticado, **When** a aplicação carrega, **Then** é pedido o consentimento da política de privacidade e, depois de aceite, aparece o resumo. — F-01 — `e2e/mock/ui.spec.ts › flows with a fake API › F-01: first access asks for privacy consent, then shows the dashboard`; `e2e/stack/journey.spec.ts › journey: import, review, confirm, analyse, delete` (função `signIn`)
3. **Given** uma conta sem compras, **When** chega ao resumo, **Then** vê o estado vazio com "Adicionar a primeira nota". — F-01, F-21 — `src/features/features.test.tsx › dashboard (RF-09, RF-11) › F-21: explains how to import the first receipt when there is no data`

---

### User Story 2 - Cancelar ou falhar o início de sessão (Priority: P1)

**Why this priority**: Erros de login não podem deixar a pessoa sem saber o que fazer.

**Independent Test**: Login com `?error=cancelled`; callback real com `error=access_denied`.

**Acceptance Scenarios**:

1. **Given** a pessoa cancela no ecrã da Google, **When** volta à aplicação, **Then** continua fora da conta e vê "O início de sessão foi cancelado…". — F-03 — `src/features/features.test.tsx › login (RF-01) › F-03: explains a cancelled sign-in`; `e2e/stack/journey.spec.ts › F-03: cancelling at the identity provider returns to sign-in with a message`

---

### User Story 3 - Sessão expirada ou terminada (Priority: P2)

A sessão é renovada em silêncio enquanto o refresh token for válido; quando deixa de ser, a pessoa é
levada ao login com uma explicação.

**Independent Test**: API simulada que passa a responder 401 a meio da utilização.

**Acceptance Scenarios**:

1. **Given** uma sessão que deixou de ser válida, **When** a aplicação faz o pedido seguinte, **Then** a pessoa vai para `/login?error=session_expired` e lê "A sua sessão terminou…". — RF-01 — `e2e/mock/ui.spec.ts › flows with a fake API › session loss sends the person to sign-in`
2. **Given** um 401 com sessão ainda renovável, **When** o pedido falha, **Then** o cliente faz um único `POST /v1/auth/refresh` (partilhado por pedidos em paralelo) e repete o pedido. — RF-01 — verificado indiretamente pelos testes de fluxo; [NEEDS CLARIFICATION: falta um teste unitário dedicado a `sessionFetch` com 401 seguido de refresh bem-sucedido]

### Edge Cases

- Sem cookie CSRF não há sessão a renovar: o 401 é devolvido sem tentar refresh (evita ciclos na página de login).
- Política de privacidade com nova versão (`current_privacy_version` ≠ `privacy_version`) volta a pedir consentimento.
- Pedidos de alteração levam sempre o header `X-CSRF-Token` lido do cookie `biq_csrf`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A UI MUST oferecer exclusivamente "Entrar com Google" (navegação completa para `/v1/auth/login`; o fluxo OAuth é do backend).
- **FR-002**: A UI MUST explicar os erros `cancelled`, `login_failed`, `provider_unavailable`, `provider_error`, `invalid_request` e `session_expired`.
- **FR-003**: Rotas protegidas MUST redirecionar para `/login` sem sessão e para `/privacidade` sem consentimento da versão atual.
- **FR-004**: O cliente MUST renovar a sessão uma vez por 401 e, se falhar, enviar a pessoa para o login.
- **FR-005**: "Terminar sessão" MUST revogar a sessão no servidor e limpar a cache local.

### Key Entities

- **Me**: id, e-mail, nome, papel (`user`/`admin`), consentimento (data e versão).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Login, consentimento e chegada ao resumo sem erros no percurso real (projeto Playwright `stack`).
- **SC-002**: Página de login sem violações axe WCAG 2.2 AA.

## Assumptions

- Localmente o login usa o servidor OIDC de teste; em staging/produção a Google (configuração do backend).
- [NEEDS CLARIFICATION: texto jurídico final da política de privacidade e base legal, a validar antes do lançamento público.]
