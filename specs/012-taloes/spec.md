# Feature Specification: Talões (Compras, Resumo e Produtos)

**Feature Branch**: `012-taloes`

**Created**: 2026-10-30

**Status**: Draft (Fase 0 do plano UX v2: só histórias e critérios de aceitação; sem requisitos técnicos, plano nem tarefas)

**Input**: Especificação Funcional v1.4 §8, RF-07, RF-09, RF-10, RF-11, RF-12; `Documentation/Super Mercado_—_Plano_de_Implementação_UX_v2.md` (Fase 4); `Documentation/design-ux-v2/TaloesV2.dc.html`. Backend: `../basketIQ-backend/specs/014-visao-geral-inicio` (US4 totais por mês, US5 produtos). Specs reestilizadas: `004-resumo-analises`, `005-produtos`, `006-definicoes-dados`.

**Convenção de rastreabilidade**: cada critério cita o RF da Especificação Funcional. Os testes do frontend levam o identificador no nome (`F-xx: …`); o F-xx atribui-se na Fase 8, na faixa da experiência v2 (F-86 a F-125). Teste de cada critério: por criar, salvo os existentes adaptados.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Aba Compras (Priority: P1)

**Why this priority**: é a lista de trabalho de todos os dias e o sítio onde se vê o que requer ação.

**Independent Test**: componente da lista com API simulada e estados mistos.

**Acceptance Scenarios**:

1. **Given** compras de vários meses, **When** abre a aba, **Then** a lista tem um cabeçalho por mês, por exemplo «Outubro 2026 · 7 confirmados · € 248». — §8
2. **Given** os filtros, **When** abre, **Then** vê «Todas», «Requer ação · N» e «Confirmadas», e cada um filtra como hoje. — RF-12
3. **Given** uma compra que requer ação, **When** é listada, **Then** leva o emblema «!» dourado no canto da inicial do mercado e o texto «rever valores», e a data a negrito. — RF-07, §8
4. **Given** uma compra em processamento, **When** é listada, **Then** leva o emblema «…», o texto «a ler o talão…» e o total «—». — §9, §8
5. **Given** os dois estados, **When** são lidos por leitor de ecrã, **Then** o estado é dito por texto e ícone, nunca só por cor. — §8
6. **Given** uma compra confirmada, **When** é tocada, **Then** abre o detalhe `/compras/:id` como hoje. — RF-12
7. **Given** a lista, **When** é paginada ou filtrada, **Then** os totais por mês vêm do endpoint de totais e não do que está carregado. — §8, RF-12 — [NEEDS CLARIFICATION: nome do endpoint; ver spec 014 do backend, US4]
8. **Given** o seletor de ano «2026», **When** é alterado, **Then** a lista mostra esse ano. — §8 — [NEEDS CLARIFICATION: o plano não descreve o seletor de ano nem o seu efeito na API]
9. **Given** eliminar uma compra ou só o original, **When** a pessoa o faz, **Then** continua a funcionar como na spec 006. — F-22, F-22a
10. **Given** compras em processamento, **When** a lista está aberta, **Then** continua a atualizar-se. — RF-12

---

### User Story 2 - Aba Resumo (Priority: P1)

O `DashboardPage` atual, reestilizado, sem alterar a lógica.

**Acceptance Scenarios**:

1. **Given** compras confirmadas, **When** abre a aba, **Then** vê o período, os filtros de supermercado e produto, o total, a variação face ao período anterior («23 % abaixo de setembro») e «Ver como tabela». — RF-09, RF-11
2. **Given** o mês de setembro de 2026, **When** é escolhido, **Then** só as compras desse mês entram no total. — F-18
3. **Given** o filtro de supermercado, **When** é alterado, **Then** todos os cartões e gráficos refletem-no. — F-19
4. **Given** uma conta ou período sem dados, **When** abre, **Then** vê o estado vazio com a ação. — F-21, RF-11
5. **Given** o gráfico, **When** usado por leitor de ecrã, **Then** existe a tabela «Gasto por período». — RF-11, §8
6. **Given** os filtros e o período, **When** mudam, **Then** vivem no URL e Voltar funciona. — RF-11
7. **Given** os testes atuais do Resumo, **When** correm adaptados à nova rota, **Then** passam sem mudar a lógica. — plano Fase 4

---

### User Story 3 - Aba Produtos e detalhe (Priority: P1)

**Acceptance Scenarios**:

1. **Given** a aba, **When** abre, **Then** vê a pesquisa «Pesquisar produto» e a lista com, por produto, o preço médio e a base (/kg, /l, /un.), o número de compras e o de mercados. — RF-10
2. **Given** um produto sem unidade conhecida, **When** é listado, **Then** não mostra preço por kg ou l. — §12.4, constituição III
3. **Given** o detalhe de «Peito de frango», **When** abre, **Then** vê o preço médio por kg, a nota «Média ponderada pelas quantidades que comprou», mínimo, máximo e quantidade comprada. — RF-10, constituição II
4. **Given** o detalhe, **When** abre, **Then** vê a evolução do preço por mês com «Ver como tabela». — RF-10, RF-11, §8
5. **Given** o detalhe, **When** abre, **Then** vê «Por mercado, nos seus talões» com a média e o último preço de cada mercado. — RF-10
6. **Given** esse bloco, **When** abre, **Then** cada mercado mostra o «preço médio que pagou», o número de compras e a janela de 90 dias, sem assinalar um mercado como «mais barato» e sem os ordenar. — RF-10, §8, D12
7. **Given** o detalhe, **When** abre, **Then** diz «A descrição original de cada compra fica guardada no histórico». — RF-10, constituição III — [NEEDS CLARIFICATION: o rascunho do passo C regista que editar uma linha substitui a descrição guardada; a frase pode não ser verdadeira]
8. **Given** os testes atuais de Produtos, **When** correm adaptados, **Then** passam. — plano Fase 4

---

### User Story 4 - Lista em papel de talão (Priority: P3, opcional)

*Adiável se o prazo apertar (plano Fase 4).*

**Acceptance Scenarios**:

1. **Given** «Os seus talões», **When** abre, **Then** os talões de um mês aparecem em papel de talão (`.receipt-paper`, Martian Mono) com a mesma informação e os mesmos estados da aba Compras, sem depender da cor. — §8
2. **Given** essa vista, **When** corre o axe em claro e escuro, **Then** o contraste de texto é pelo menos 4,5:1. — §8, §10

---

### User Story 5 - Qualidade (Priority: P1)

**Acceptance Scenarios**:

1. **Given** cada aba, **When** corre o axe em claro e escuro de 320 a 820 px, **Then** não há violações. — §8, §10
2. **Given** o selo de atenção, **When** corre o teste novo, **Then** verifica emblema, texto «rever valores» e anúncio por leitor de ecrã. — RF-07, §8
3. **Given** os testes existentes de Compras, Resumo e Produtos, **When** correm, **Then** passam adaptados. — plano Fase 4
4. **Given** os mercados, **When** são mostrados, **Then** usam texto e inicial, sem logótipos. — design-ux-v2/README

### Edge Cases

- Mês sem compras confirmadas: não aparece cabeçalho.
- Compra «só com total»: aparece na lista e fora dos preços por produto.
- Compra de outra conta responde «Compra não encontrada» (SEC).

## Requirements *(mandatory)*

*Por escrever em `/speckit-clarify` e `/speckit-plan`; a Fase 0 cobre só histórias e critérios.*

## Success Criteria *(mandatory)*

*Por escrever. O plano pede: testes existentes passam adaptados e novo teste do selo de atenção.*

## Assumptions

- Depende das specs 009 (rotas e abas) e 014 do backend (totais por mês, produtos enriquecidos).
