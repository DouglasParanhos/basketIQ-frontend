# Feature Specification: Resumo e análises

**Feature Branch**: `004-resumo-analises`

**Created**: 2026-10-15

**Status**: Implemented

**Input**: Especificação Funcional RF-09, RF-11, §4.3; Plano de Testes F-18, F-19, F-21, §10. Backend: `../Backend/specs/005-analises`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver o gasto do período (Priority: P1)

O resumo mostra o gasto total do período (mês, trimestre, ano ou intervalo), a variação face ao
período anterior equivalente, compras, unidades, preço médio por unidade, gasto por dia/mês,
distribuição por supermercado e produtos mais gastos/comprados.

**Acceptance Scenarios**:

1. **Given** compras confirmadas, **When** abre o resumo, **Then** vê o total, a variação ("+12,5 % face a …") e a tabela alternativa ao gráfico. — RF-09, RF-11 — `src/features/features.test.tsx › dashboard (RF-09, RF-11) › shows totals, variation, an accessible table and empty periods`
2. **Given** o mês de setembro de 2026, **When** é escolhido, **Then** só as compras desse mês entram no total. — F-18 — `e2e/stack/journey.spec.ts › journey: import, review, confirm, analyse, delete`; períodos: `src/lib/lib.test.ts › periods (F-18) › builds month, quarter and year ranges`, `… › moves across year boundaries`
3. **Given** o filtro de supermercado, **When** é alterado, **Then** é enviado à API e todos os cartões e gráficos refletem o filtro. — F-19 — `src/features/features.test.tsx › dashboard (RF-09, RF-11) › F-19: the merchant filter is sent with the query`; `e2e/stack/journey.spec.ts › journey: import, review, confirm, analyse, delete` (45,39 € → 36,34 €)
4. **Given** um produto no ranking, **When** toca "Filtrar resumo", **Then** o resumo combina período, supermercado e produto. — RF-11 — [NEEDS CLARIFICATION: combinação com produto sem teste de UI; agregação coberta no backend]

---

### User Story 2 - Estados vazios e dados insuficientes (Priority: P1)

**Acceptance Scenarios**:

1. **Given** uma conta sem compras, **When** abre o resumo, **Then** vê "Comece pela primeira nota" e a ligação para adicionar. — F-21 — `src/features/features.test.tsx › dashboard (RF-09, RF-11) › F-21: explains how to import the first receipt when there is no data`; `e2e/mock/ui.spec.ts › flows with a fake API › F-21: empty account explains how to import the first receipt`
2. **Given** um período sem compras, **When** é escolhido, **Then** vê "Sem compras neste período" com ação. — F-21 — verificado manualmente; [NEEDS CLARIFICATION: sem teste automatizado do período vazio com conta não vazia]
3. **Given** dados insuficientes para uma evolução, **When** o resumo abre, **Then** aparece uma explicação em vez do gráfico. — RF-11 — `src/features/features.test.tsx › dashboard (RF-09, RF-11) › does not draw a misleading chart with insufficient data`
4. **Given** o gráfico, **When** a pessoa usa leitor de ecrã, **Then** existe tabela "Gasto por período". — RF-11, §10 — `e2e/mock/ui.spec.ts › flows with a fake API › chart has a textual alternative (RF-11)`

### Edge Cases

- Filtros e período vivem no URL (partilháveis, botão Voltar funciona).
- Produtos ao peso contam como uma unidade; a nota de rodapé explica a regra.
- Só compras confirmadas entram (explicado no rodapé).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Seletor de período MUST suportar mês, trimestre, ano e intervalo, com navegação anterior/seguinte.
- **FR-002**: Filtros MUST ser combináveis (período × supermercado × produto). Categorias não existem no MVP.
- **FR-003**: Cada gráfico MUST ter tabela alternativa; a cor do gráfico é validada para claro e escuro.
- **FR-004**: A variação MUST indicar o período anterior usado na comparação.

## Success Criteria *(mandatory)*

- **SC-001**: Resumo sem violações axe (`e2e/mock/ui.spec.ts › accessibility … › resumo has no axe violations`).
- **SC-002**: Resposta do resumo p95 < 2 s com 5 000 linhas (medido no backend: 47 ms).

## Assumptions

- Gráficos de série única (cobalto); identidade dos supermercados por texto, sem paleta categórica.
