# Feature Specification: Definições, compras e eliminação de dados

**Feature Branch**: `006-definicoes-dados`

**Created**: 2026-10-15

**Status**: Implemented

**Input**: Especificação Funcional RF-12; Plano de Testes F-22, F-22a, F-23, §9. Backend: `../Backend/specs/006-gestao-dados-retencao`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Listar e eliminar compras (Priority: P1)

A lista de compras mostra supermercado, data, total e estado, com filtros "Todas", "Requer ação" e
"Confirmadas" e paginação. A pessoa elimina uma compra completa ou apenas o ficheiro original.

**Acceptance Scenarios**:

1. **Given** uma compra confirmada, **When** a pessoa a elimina, **Then** desaparece da lista e do resumo. — F-22 — `e2e/stack/journey.spec.ts › journey: import, review, confirm, analyse, delete`
2. **Given** uma compra confirmada, **When** escolhe "Apagar só o ficheiro" e confirma, **Then** o original deixa de estar disponível e os dados mantêm-se. — F-22a — `src/features/features.test.tsx › review (RF-07, F-11..F-15) › F-22a: deleting only the original keeps the purchase`
3. **Given** uma compra confirmada, **When** abre "Ficheiro e dados", **Then** vê a data de eliminação automática do original (30 dias). — F-22b — apresentação verificada manualmente; a eliminação é verificada no backend (`tests/api/test_receipts.py::test_retention_job_purges_originals_after_30_days`)
4. **Given** a lista, **When** é aberta, **Then** não há violações axe. — §10 — `e2e/mock/ui.spec.ts › accessibility (plano de testes §10) › compras has no axe violations`

---

### User Story 2 - Eliminar a conta (Priority: P1)

**Acceptance Scenarios**:

1. **Given** "Eliminar conta", **When** a pessoa toca, **Then** vê as consequências e o botão final só fica ativo depois de marcar "Compreendo…". — F-23 — `src/features/features.test.tsx › settings (RF-12) › F-23: account deletion explains the consequence and needs explicit confirmation`
2. **Given** a confirmação, **When** elimina, **Then** é levada ao login e os dados desaparecem. — F-23 — `e2e/stack/journey.spec.ts › journey: import, review, confirm, analyse, delete`
3. **Given** as definições, **When** abre, **Then** vê a conta, a política aceite e "Terminar sessão", sem violações axe. — RF-12, §10 — `e2e/mock/ui.spec.ts › accessibility (plano de testes §10) › definições has no axe violations`

### Edge Cases

- Ações destrutivas pedem sempre confirmação explícita no próprio ecrã.
- Uma compra de outra conta responde "Compra não encontrada". — SEC — `e2e/stack/journey.spec.ts › SEC: another account cannot open my receipt`

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Eliminar compra, eliminar original e eliminar conta MUST pedir confirmação com a consequência descrita.
- **FR-002**: "Ver original" MUST usar um URL temporário (60 s) obtido no momento.
- **FR-003**: A lista MUST continuar a atualizar enquanto houver compras em processamento.

## Success Criteria *(mandatory)*

- **SC-001**: Depois de eliminar, o resumo não conta a compra (verificado no percurso real).

## Assumptions

- Exportação CSV/Excel fora do MVP.
- [NEEDS CLARIFICATION: prazo e confirmação por e-mail para a eliminação da conta, se a política o exigir.]
