# Feature Specification: Editar um talão já validado

**Feature Branch**: `feature/editar-talao-validado`

**Created**: 2026-11-07

**Status**: Implemented

**Input**: pedido do Douglas, 2026-11-07: «O sistema deve também permitir a edição de talões que já tenham sido validados. Antes da funcionalidade de edição aparecer deve aparecer uma confirmação informando que o talão já foi validado, se o utilizador quer realmente continuar.» Backend: `../basketIQ-backend/specs/018-editar-talao-validado` (`POST /v1/receipts/{id}/reopen`).

**Convenção de rastreabilidade**: F-239 a F-241 (Plano de Testes §5.1, faixa F-236 a F-245).

## Clarifications

### Session 2026-11-07

- Q: O que acontece ao estado do talão? → A: **Reabre para revisão** (decisão do Douglas): sai dos gastos até ser confirmado outra vez. A confirmação di-lo, para a pessoa saber o que a espera.
- Q: Onde fica o botão? → A: no talão validado, por baixo da nota, antes de «Início» e «Adicionar outra nota». A pergunta abre no lugar, como a de «Eliminar compra» (`FootQuestion`: recebe o foco e é lida).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Editar um talão validado, depois de confirmar (Priority: P1)

**Acceptance Scenarios**:

1. **Given** um talão validado, **When** a pessoa toca em «Editar talão», **Then** aparece a pergunta «Este talão já foi validado» (texto em [contracts/copy.md](./contracts/copy.md)) e nada é enviado; os dados continuam só de leitura. «Cancelar» fecha a pergunta. — F-239 · `features.test.tsx`
2. **Given** a pergunta aberta, **When** toca em «Sim, editar», **Then** o talão é reaberto com a versão atual e aparece a revisão, com os campos editáveis; as listas e o resumo voltam a ser pedidos. Um erro (por exemplo, o talão mudou noutro lado) aparece na pergunta. — F-240 · `features.test.tsx`
3. O caminho completo no browser, com a pergunta e a revisão sem violações axe. — F-241 · `e2e/mock/ui.spec.ts`

## Requirements *(mandatory)*

- **FR-001**: Um talão `CONFIRMED` mostra «Editar talão» (F-239).
- **FR-002**: A revisão só aparece depois de a pessoa confirmar a pergunta (F-239, F-240).

## Success Criteria *(mandatory)*

- **SC-001**: F-239 a F-241 verdes; `pnpm lint typecheck test e2e:mock` verdes.
