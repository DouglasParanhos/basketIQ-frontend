# Feature Specification: Produtos e histórico de preços

**Feature Branch**: `005-produtos`

**Created**: 2026-10-15

**Status**: Implemented

**Input**: Especificação Funcional RF-10, §4.3; Plano de Testes F-20. Backend: `../Backend/specs/005-analises`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pesquisar e abrir um produto (Priority: P1)

A pessoa pesquisa um produto comprado, abre-o e vê quantidade total, gasto, preço médio ponderado com
a base de cálculo (por unidade, por kg, por litro), mínimo e máximo, evolução do preço e comparação
entre supermercados.

**Acceptance Scenarios**:

1. **Given** "frango" pesquisado, **When** abre "PEITO FRANGO", **Then** vê "Preço médio por kg" e o preço observado. — F-20, RF-10 — `e2e/stack/journey.spec.ts › journey: import, review, confirm, analyse, delete`
2. **Given** a lista de produtos, **When** é aberta, **Then** não há violações axe. — §10 — `e2e/mock/ui.spec.ts › accessibility (plano de testes §10) › produtos has no axe violations`
3. **Given** compras em vários supermercados, **When** abre o produto, **Then** a tabela compara preço médio e último preço por supermercado. — RF-10 — cálculos verificados no backend (`tests/api/test_analytics.py::test_product_history_weighted_average_and_merchant_comparison`); [NEEDS CLARIFICATION: sem teste de UI da tabela de comparação]

### Edge Cases

- Menos de duas compras: explicação em vez do gráfico de evolução; o histórico continua em tabela.
- Unidades mistas: compras noutra unidade não entram no preço médio e isso é dito.
- A descrição original de cada compra aparece no histórico.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Pesquisa MUST procurar apenas produtos das compras confirmadas da pessoa.
- **FR-002**: O preço médio MUST indicar a base de cálculo.
- **FR-003**: O gráfico de preço MUST ter tabela alternativa ("Ver como tabela").

## Success Criteria *(mandatory)*

- **SC-001**: Valores de preço coincidem com os do backend (formatação apenas).

## Assumptions

- O nome do produto é o normalizado/corrigido; corrigir o nome faz-se na revisão de uma compra.
