# Feature Specification: PWA, ecrãs pequenos e acessibilidade

**Feature Branch**: `008-pwa-acessibilidade`

**Created**: 2026-10-15

**Status**: Implemented

**Input**: Especificação Funcional §8, decisão MVP 1; Especificação Técnica §8; Plano de Testes §10, §11.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Usar com uma mão num telemóvel (Priority: P1)

**Acceptance Scenarios**:

1. **Given** um ecrã de telemóvel, **When** a aplicação abre, **Then** a navegação inferior tem Resumo, Compras, Adicionar e Definições, ancorada em baixo, com alvos ≥ 44 px. — §8, §10 — `e2e/mock/ui.spec.ts › small screens (plano de testes §11) › bottom navigation reachable with one hand: 4 items, ≥ 44px targets`
2. **Given** larguras de 320, 375, 390, 430 e 820 px, **When** se abre resumo, revisão e adicionar, **Then** não há scroll horizontal. — §11 — `e2e/mock/ui.spec.ts › small screens (plano de testes §11) › no horizontal scrolling at 320px` (e 375/390/430/820)

---

### User Story 2 - Acessibilidade (Priority: P1)

**Acceptance Scenarios**:

1. **Given** login, resumo, compras, revisão, adicionar, definições e produtos, **When** o axe corre com WCAG 2.0/2.1/2.2 A e AA, **Then** não há violações. — §10 — `e2e/mock/ui.spec.ts › accessibility (plano de testes §10) › <página> has no axe violations`
2. **Given** modo escuro, **When** a revisão abre, **Then** não há problemas de contraste. — §10 — `e2e/mock/ui.spec.ts › accessibility (plano de testes §10) › dark mode has no contrast violations`
3. **Given** baixa confiança ou erro, **When** é mostrado, **Then** tem ícone e texto, não só cor. — §10 — `e2e/mock/ui.spec.ts › flows with a fake API › F-12: low confidence shown with words and a marker, not colour alone`
4. **Given** um gráfico, **When** se usa leitor de ecrã, **Then** há tabela equivalente. — §10 — `e2e/mock/ui.spec.ts › flows with a fake API › chart has a textual alternative (RF-11)`

---

### User Story 3 - Instalar como aplicação (Priority: P2)

**Acceptance Scenarios**:

1. **Given** um navegador compatível, **When** a pessoa instala, **Then** a aplicação abre em modo standalone com ícones 192/512 e maskable e com o nome configurado no backend (`APP_NAME_FOR_CUSTOMER`). O manifesto não é gerado no build: é servido por `GET /v1/config/manifest.webmanifest` (`<link rel="manifest">` em `index.html`; `manifest: false` em `vite.config.ts`). — §8, CFG-02 — `e2e/mock/ui.spec.ts › customer-facing name (CFG-02) › title, login and manifest follow the name served by the backend`; `e2e/stack/journey.spec.ts › CFG-02: name, title and manifest come from the backend's config/app-config.yaml`; [NEEDS CLARIFICATION: sem teste automatizado de instalação/Lighthouse PWA]
2. **Given** o service worker, **When** a aplicação usa a API, **Then** nenhuma resposta `/v1/**` é guardada em cache. — Técnica §8 — configuração `navigateFallbackDenylist` e `runtimeCaching: []` em `vite.config.ts`; [NEEDS CLARIFICATION: falta teste que inspecione a cache do service worker]

### Edge Cases

- Testes Playwright bloqueiam o service worker para não mascarar pedidos.
- `prefers-reduced-motion` anula animações.
- O conversor HEIC (1,3 MB) não entra no precache: só é descarregado quando é preciso.
- O título estático de `index.html` ("Super Mercado") é só um valor por omissão até a aplicação ler o nome de `GET /v1/config`; se o backend estiver em baixo, mantém-se.
- O manifesto precisa do backend: sem rede ou com a API em baixo, o navegador mantém o último manifesto que obteve.
- `short_name` é igual ao nome; nomes com mais de ~12 caracteres podem aparecer truncados no ecrã inicial.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Layout MUST funcionar a partir de 320 px; em ≥ 768 px a navegação passa a barra lateral.
- **FR-002**: Foco visível e ligação "Saltar para o conteúdo".
- **FR-003**: Tipos de letra servidos pela própria aplicação (apenas subconjunto latino).

## Success Criteria *(mandatory)*

- **SC-001**: Zero violações axe nas páginas principais (gate de CI).
- **SC-002**: Precache ≤ ~1 MB.

## Assumptions

- Matriz de compatibilidade (Android/iOS, Safari): [NEEDS CLARIFICATION: CI corre só Chromium (Pixel 7); testar WebKit/iOS Safari antes do lançamento.]
- [NEEDS CLARIFICATION: idiomas além de pt-PT.]
