# Feature Specification: Início

**Feature Branch**: `011-inicio`

**Created**: 2026-10-30

**Status**: Especificada em 2026-10-31; decisões da Liz aplicadas no mesmo dia (D-P1 a D-P12). **Bloqueada pelo backend:** depende de `GET /v1/analytics/overview` (spec 014 do backend, por implementar). O contrato existe como texto no backend (`specs/014-visao-geral-inicio/contracts/api.md`); não há OpenAPI publicado nem `schema.d.ts` com `overview`. Falta o `status` das últimas compras (Q7 mudou).

**Input**: Especificação Funcional v1.4 RF-15, RF-13, RF-12; `Documentation/Super Mercado_—_Plano_de_Implementação_UX_v2.md` (Fase 3, D4, D5, D7, decisões 9, 13 e 17); `Documentation/design-ux-v2/HomeF.dc.html` e `HomeG.dc.html` (layout, estados e dados de exemplo; textos conforme a tabela de substituições do `README.md`). Backend: `../basketIQ-backend/specs/014-visao-geral-inicio` (US1 a US3 e US6).

**Convenção de rastreabilidade**: cada critério cita o RF da Especificação Funcional. Os testes do frontend levam o identificador no nome (`F-xx: …`); os identificadores são **F-183 a F-188, um por história** (tabela «Identificadores de teste» no fim; aprovados pela Liz a 2026-10-31, porque o backend 014 usa F-176 a F-182). Os cenários de cálculo (faixas, média, semanas) são «Verificado no Backend»; aqui verifica-se o que o ecrã mostra a partir do que a API devolve.

**Fora desta spec (decisão de 2026-10-30):** o cartão da lista inteligente e o cartão «mesmo produto, mercados diferentes» só se constroem depois do passo C e fazem parte da spec 015. Nesta fase o Início não os tem, mesmo com a opção da lista ligada.

## Clarifications

### Session 2026-10-31

Respostas deduzidas dos documentos (HANDOFF, plano UX v2, README de design, spec 014 do backend, spec 010), dadas sem supervisão. **A 2026-10-31 a Liz decidiu D-P1 a D-P12** (ver a última entrada desta secção); onde uma resposta abaixo dizia «por confirmar», vale a decisão. O relatório está em `Documentation/ANALISE_spec011_frontend_2026-10-31.md`.

- Q: Para onde vai «Definir a minha meta pessoal»? → A: para a edição da meta no Perfil das Definições (spec 014 do frontend). O passo 4 do onboarding deixou de ser opção: `/boas-vindas` leva quem já concluiu para o Início (spec 010, decisão 17). Até o Perfil existir (Fase 6), o botão aponta para `/definicoes`. O lançamento espera pelo Perfil (decisão da Liz, 2026-10-30).
- Q: Quem vê o anel sem meta? → A: **todas as contas anteriores ao onboarding** (a migração do backend marca-as como concluídas, sem meta) e quem saltou o passo da meta. É o estado normal de muita gente, não um caso raro.
- Q: Como se distingue «sem dados» de «mês sem compras»? → A: pelo campo `empty` da API (spec 014, US3.5 e US3.6): `empty = true` quando a conta não tem nenhuma compra confirmada; mês sem compras de uma conta com compras vem com `empty = false` e zeros.
- Q: Há navegação entre meses? → A: sim, como no HomeF («Mês anterior», «Este mês», «Mês seguinte»), com o mês no URL; a API aceita `month=YYYY-MM` e um mês futuro devolve zeros. O botão «Mês seguinte» fica desativado no mês corrente (aprovado, D-P5).
- Q: Como se escrevem os valores? → A: com o formatador pt-PT do repositório (`formatCents`, por exemplo «248,00 €»), não «€ 248» como no protótipo; a soma gasto + saldo fica exata no ecrã. **Decidido (D-P4):** cêntimos («248,00 €»), não euros inteiros.
- Q: O cliente calcula o saldo da meta? → A: o saldo é `goal_cents − spent_cents`, uma subtração de inteiros em cêntimos, só de apresentação (constituição II). Não está no contrato da 014: pergunta C4 no relatório.
- Q: O que diz o anel quando o gasto passa a meta (saldo negativo)? → A: o anel enche-se por completo na faixa vermelha e o texto passa a «Acima da meta pessoal este mês · 52,00 € além da meta», sem «saldo» negativo, sinal de menos, «excedeu» nem «perdeu». Com gasto igual à meta, mantém-se «Reta final · saldo da meta: 0,00 €». A escolha entre os dois textos faz-se pelo sinal de `goal_cents − spent_cents` (inteiros), não por `goal_pct`, que arredonda. **Aprovado (D-P1).**
- Q: O fundo vermelho do cartão da média quando o gasto está acima? → A: mantém-se, porque o RF-15 já o fixa («verde se abaixo, vermelho se acima»); o texto é neutro («12 % acima da média»), sem ícone de alarme nem verbo de censura, e diz sempre o mesmo que a cor. **Aprovado (D-P2).**
- Q: Quem decide o intervalo de «na média» e qual é? → A: o backend, porque é regra de negócio com limiares configuráveis como as faixas do anel (a spec 014 só devolve `recent_vs_average_pct`, um número). **Resolvido (D-P12):** o backend expõe `average_trend` (`below`, `on_average`, `above`; limiar `AVERAGE_ON_TARGET_PCT` = 5). O cliente mapeia o campo e não aplica limiares.
- Q: «Mês seguinte» fica ativo no mês corrente? → A: não, fica desativado; num mês passado leva ao mês seguinte. Um mês futuro escrito à mão no URL mostra zeros (a API aceita-o). **Aprovado (D-P5).**
- Q: Decisões da Liz de 2026-10-31 → A: D-P1, D-P2, D-P4, D-P5, D-P8, D-P9, D-P10, D-P11 e D-P12 aceites como recomendadas; D-P3 aprovada (`--color-warn`); D-P7: os meses passados mostram a meta atual com a nota «Meta atual»; D-P6: os identificadores passam a **F-183 a F-188** (o backend 014 usa F-176 a F-182); Q7 do backend mudou: as últimas compras incluem as que requerem revisão ou estão em processamento, com `status`.
- Q: Que texto mostra o cartão da média com média e sem tendência (só 2 meses de dados)? → A: o valor da média e «Tendência: ainda sem meses suficientes», sem fundo colorido e sem citar um número de meses que a API não expõe. **Por confirmar pela Liz (D-P13).**
- Q: Mostra-se a «média por semana» do HomeF? → A: não, enquanto a API não a devolver: o cliente não calcula médias (constituição III). **Por confirmar pela Liz (D-P14).**

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Anel da meta pessoal (Priority: P1)

**Why this priority**: é o centro do ecrã e a parte com mais risco de tom.

**Independent Test**: componente do anel com os quatro estados e dados simulados.

**Acceptance Scenarios**:

1. **Given** meta de 400 € e gasto de 152 €, **When** o Início abre, **Then** o anel mostra 38 %, a faixa verde, «Tranquilo · saldo da meta: 248,00 €» e «A sua meta pessoal: 400,00 €». — RF-15
2. **Given** gasto de 248 €, **When** abre, **Then** mostra 62 %, a faixa laranja e «Quase lá · saldo da meta: 152,00 €». — RF-15
3. **Given** gasto de 352 €, **When** abre, **Then** mostra 88 %, a faixa vermelha e «Reta final · saldo da meta: 48,00 €». — RF-15
4. **Given** nenhuma meta (`band` sem meta), **When** abre, **Then** o anel está vazio e tracejado, mostra «—», «Sem meta pessoal definida», o gasto do mês e o botão «Definir a minha meta pessoal». — RF-15
5. **Given** o botão «Definir a minha meta pessoal», **When** a pessoa o toca, **Then** vai para a edição da meta no Perfil das Definições (até o Perfil existir, para `/definicoes`). — RF-13, RF-15
6. **Given** qualquer faixa, **When** é lida por leitor de ecrã, **Then** o anel tem alternativa em texto («Anel verde, 38 % da meta usada») e a cor nunca é o único sinal. — §8, RF-15
7. **Given** o ecrã, **When** é mostrado, **Then** a nota «A meta pessoal é um objetivo seu, não um limite.» está sempre visível. — RF-13, RF-15
8. **Given** gasto acima da meta, **When** abre, **Then** o anel enche-se por completo na faixa vermelha e o texto é «Acima da meta pessoal este mês · 52,00 € além da meta», sem saldo negativo nem linguagem de perda; com gasto igual à meta, o texto é «Reta final · saldo da meta: 0,00 €». — RF-15
9. **Given** valores em cêntimos, **When** são mostrados, **Then** a formatação é só de apresentação (`src/lib/format.ts`). — constituição II
10. **Given** respostas do backend para uma meta de 400 € com gasto de 200,00 €, 201,60 €, 202,00 €, 300,00 €, 301,60 € e 302,00 €, **When** o Início abre, **Then** o ecrã mostra 50 %, 50 %, 51 %, 75 %, 75 % e 76 %, e as faixas verde, verde, laranja, laranja, laranja e vermelha (teste de fronteira; verde até 50 % inclusive, laranja acima de 50 % até 75 % inclusive, vermelho acima de 75 %). — RF-15
11. **Given** `goal_pct` e `band` devolvidos pelo backend, **When** o anel é desenhado, **Then** o cliente mostra os dois valores tal como vêm e não recalcula a faixa; a faixa é a da percentagem arredondada que o ecrã mostra. — RF-15
12. **Given** uma conta anterior ao onboarding (concluída e sem meta), **When** entra, **Then** vê o Início com o anel sem meta e o botão «Definir a minha meta pessoal», sem passar por `/boas-vindas`. — RF-13, RF-14, RF-15
13. **Given** um mês que não é o corrente, **When** o anel é mostrado, **Then** a meta aparece com a nota «Meta atual» («A sua meta pessoal: 400,00 € · Meta atual»), porque a API devolve sempre a meta de hoje; a alternativa em texto diz «… da meta atual usada». — RF-15 (D-P7)
14. **Given** um gasto de 399,00 € para uma meta de 400,00 € (`goal_pct` 100), **When** abre, **Then** o texto é «Reta final · saldo da meta: 1,00 €» com 100 %, não o de «acima da meta». — RF-15

---

### User Story 2 - Média mensal (Priority: P1)

**Acceptance Scenarios**:

1. **Given** média disponível e gasto abaixo, **When** abre, **Then** o cartão mostra o valor, «Últimos 2 meses: 7 % abaixo da média» e fundo suave verde, com o texto a dizer o mesmo. — RF-15
2. **Given** média disponível e gasto acima, **When** abre, **Then** o fundo é suave vermelho (RF-15) e o texto diz «12 % acima da média», sem ícone de alarme nem verbo de censura. — RF-15 (D-P2)
3. **Given** média disponível e gasto próximo dela, **When** abre, **Then** o cartão é neutro e diz «na média» quando `average_trend` é `on_average`; o intervalo é do backend (±5 %) e o cliente não o aplica. — RF-15 (D-P12)
4. **Given** menos meses do que o mínimo, **When** abre, **Then** mostra «— €» e «Aparece com 2 meses de histórico», sem fundo colorido; o «2» é `average_min_months` da resposta e não um valor fixo no cliente. — RF-15
5. **Given** o fundo colorido, **When** medido, **Then** o contraste do texto é pelo menos 4,5:1 em claro e escuro. — §8
6. **Given** o cartão da média, **When** é lido, **Then** a cor do fundo nunca é o único sinal: o texto diz «abaixo», «acima» ou «na média». — §8, RF-15
7. **Given** média disponível e `average_trend` nulo (só 2 meses de dados), **When** abre, **Then** o cartão mostra o valor da média e «Tendência: ainda sem meses suficientes», sem fundo colorido. — RF-15, RF-11 (texto por confirmar pela Liz, D-P13)
8. **Given** um mês passado, **When** o cartão da média é mostrado, **Then** é igual ao do mês corrente: a média e a tendência não dependem do mês mostrado. — RF-15

---

### User Story 3 - Estados vazios (Priority: P1)

**Acceptance Scenarios**:

1. **Given** uma conta sem nenhuma compra confirmada (`empty`), **When** abre, **Then** vê o ecrã final com cartões tracejados, «A aguardar o seu primeiro talão», «Quanto mais talões registar, mais aprendemos sobre as suas compras» e o botão «Adicionar talão». — RF-15, F-21
2. **Given** o botão «Adicionar talão», **When** é tocado, **Then** vai para Adicionar. — RF-15
3. **Given** poucos dados, **When** abre, **Then** cada cartão diz o que falta («Aparece com 2 meses de histórico», «0/2 meses» onde houver progresso). — RF-15, RF-11
4. **Given** uma conta com compras e sem compras no mês, **When** abre, **Then** o mês aparece com zeros, não o estado de conta vazia. — RF-15
5. **Given** o estado sem dados, **When** corre o axe, **Then** não há violações. — §8, §10
6. **Given** os cartões tracejados, **When** lidos por leitor de ecrã, **Then** são anunciados como ainda indisponíveis e não como valores. — RF-11
7. **Given** o pedido da visão geral a carregar, **When** o ecrã aparece, **Then** vê um indicador de carregamento e nenhum valor inventado, nem zeros. — constituição III
8. **Given** o pedido falha (sem rede ou erro do servidor), **When** o ecrã aparece, **Then** vê um erro com a ação «Tentar de novo» e nenhum valor antigo como se fosse atual. — RF-15, constituição IV

---

### User Story 4 - Gasto, mercados e últimas compras (Priority: P2)

**Acceptance Scenarios**:

1. **Given** compras no mês e no anterior, **When** abre, **Then** vê «Compras no mês 7» e «Mês passado: 11»; num mês que não é o corrente, «Mês anterior: 11». — RF-15 (D-P10)
2. **Given** o gasto por semana, **When** abre, **Then** vê as semanas (1 a 5, cada uma com o intervalo de dias e o valor) e uma alternativa em tabela; a «média por semana» só aparece se a API a devolver. — RF-15, RF-11, §8
3. **Given** «Onde gasta mais», **When** abre, **Then** vê cada mercado com valor e percentagem em texto e inicial, sem depender da cor da barra. — RF-15, §8
4. **Given** «Últimas compras», **When** abre, **Then** vê até 5, com mercado, data e total (nulo → «—»), e «Ver todas» leva a `/compras`. — RF-15
5. **Given** o ecrã, **When** é revisto, **Then** não mostra preços de outros sites, «poupou X», «mais comprados» nem gasto acumulado por dia, nem os cartões da lista e da comparação entre mercados. — RF-15
6. **Given** uma compra recente que requer revisão ou está em processamento (a API devolve-as com `status`, decisão da Liz de 2026-10-31), **When** aparece nas últimas compras, **Then** o estado é texto e ícone, não só cor, e a compra não entra em nenhum valor do ecrã além da sua linha. — §8 — [os valores de `status` estão por definir: C12]

---

### User Story 5 - Qualidade (Priority: P1)

**Acceptance Scenarios**:

1. **Given** os quatro estados do anel e os estados vazios, **When** correm os testes, **Then** cada um tem um teste. — RF-15
2. **Given** o Início, **When** corre o axe em claro e escuro de 320 a 820 px, **Then** não há violações. — §8, §10
3. **Given** o endpoint de visão geral, **When** mede com 5 000 linhas, **Then** p95 < 2 s. — §10 (medido no backend)
4. **Given** o texto, **When** é revisto, **Then** não usa linguagem de perda, «limite» como obrigação ou «poupou», e está em português europeu conforme a tabela do `README.md` (por exemplo «Quase lá», «A aguardar», «A sua meta»). — RF-13, §8
5. **Given** o anel de três faixas, **When** comparado com a spec 004 («gráficos de série única»), **Then** a exceção está registada e a spec 004 atualizada. — D7
6. **Given** o Início aberto, **When** se contam os pedidos à API, **Then** há um único pedido de visão geral por mês mostrado, sem chamadas a `summary`, `consumption` nem a outros agregados. — constituição VIII

---

### User Story 6 - Navegar entre meses (Priority: P2)

*Acrescentada em 2026-10-31: o HomeF mostra «Mês anterior» e «Mês seguinte» e a API aceita `month=YYYY-MM`, mas o rascunho da Fase 0 não tinha critérios.*

**Acceptance Scenarios**:

1. **Given** o Início, **When** abre sem mês no URL, **Then** mostra o mês corrente (hora de Lisboa) com o rótulo «Este mês» e o intervalo («1 – 31 out. 2026»). — RF-15
2. **Given** «Mês anterior», **When** a pessoa o toca, **Then** o ecrã mostra o mês anterior, o mês fica no URL e o botão «Voltar» do navegador regressa ao mês visto antes. — RF-15, constituição VIII
3. **Given** o mês corrente, **When** a pessoa o vê, **Then** «Mês seguinte» está desativado; num mês passado leva ao seguinte. — RF-15 (D-P5)
4. **Given** um mês passado, **When** é mostrado, **Then** o rótulo diz o mês e o ano, o anel usa a meta e o gasto desse mês tal como a API os devolve, e os botões têm nome acessível («Mês anterior», «Mês seguinte»). — RF-15, §8
5. **Given** um `mes` inválido no URL, **When** abre, **Then** mostra o mês corrente. — RF-15

---

### Edge Cases

- Sem rede: o Início mostra o estado de erro com ação, nunca valores antigos como se fossem atuais (o service worker não guarda a API).
- Mês com a faixa no limite exato: decidido (verde até 50 % inclusive, laranja até 75 % inclusive); ver os testes de fronteira acima e na spec 014 do backend.
- Meta definida e nenhuma compra no mês: o anel mostra 0 % na faixa verde e «Tranquilo · saldo da meta: <meta>»; não é o estado de conta vazia.
- Conta com compras mas sem meta (a maioria das contas anteriores ao onboarding): ver US1.4 e US1.12; a média e as compras continuam a aparecer.
- A API devolve `goal_pct` acima de 100: o anel enche-se por completo e não passa do círculo; o texto segue a decisão da US1.8.
- Mês futuro escrito à mão no URL: a API devolve zeros e o ecrã mostra-os sem erro.
- Rota antiga: os endereços antigos do Resumo na raiz (`/?periodo=…`) continuam a redirecionar para `/compras/resumo` (spec 009, F-96).
- Compra «só com total»: entra no gasto do mês (backend 014, R1: o gasto é o total da compra, ou a soma das linhas se faltar; pode diferir em cêntimos do Resumo); o ecrã não a trata à parte.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O Início MUST substituir a página provisória da rota `/` e MUST manter o redirecionamento dos endereços antigos do Resumo (spec 009, F-96). — US1, US6, RF-15
- **FR-002**: Os dados do Início MUST vir de um único `GET /v1/analytics/overview?month=YYYY-MM` por mês mostrado, com os tipos gerados do OpenAPI (`gen:api`); o cliente MUST NOT usar nomes de campos que a spec 014 do backend não defina. — US5.6, constituição VI
- **FR-003**: O anel MUST mostrar `goal_pct` e `band` tal como a API os devolve, sem recalcular a faixa nem a percentagem; o texto da faixa («Tranquilo», «Quase lá», «Reta final») e o saldo da meta MUST aparecer sempre junto do anel. — US1.1 a US1.3, US1.10, US1.11, RF-15
- **FR-004**: Sem meta (`goal_cents` nulo), o anel MUST aparecer vazio, com «—», «Sem meta pessoal definida» e o botão «Definir a minha meta pessoal», e o gasto do mês MUST continuar visível. — US1.4, US1.12
- **FR-005**: O anel MUST ter alternativa em texto com a cor e a percentagem, e a cor MUST NOT ser o único sinal. A nota «A meta pessoal é um objetivo seu, não um limite.» MUST estar sempre visível. — US1.6, US1.7, constituição V
- **FR-006**: O cartão da média MUST mostrar o valor e a tendência dos últimos 2 meses só quando `monthly_average_cents` existe; com fundo suave verde (abaixo) ou vermelho (acima) só então, sempre com texto, e neutro com «na média» (intervalo do backend, US2.3); sem média, «— €» e o que falta, sem fundo colorido. — US2
- **FR-007**: Com `empty` verdadeiro, o ecrã MUST mostrar o estado final com cartões tracejados, «A aguardar o seu primeiro talão» e «Adicionar talão»; com `empty` falso e mês sem compras, o ecrã MUST mostrar zeros. — US3.1, US3.4
- **FR-008**: O ecrã MUST mostrar as compras do mês e do mês anterior, o gasto por semana (sem média por semana enquanto a API não a devolver) e uma tabela alternativa, «Onde gasta mais» com valor, percentagem e inicial em texto, e as últimas compras (também as que requerem revisão ou estão em processamento, com o estado em texto e ícone) com «Ver todas» para `/compras`. — US4
- **FR-009**: O ecrã MUST NOT mostrar o cartão da lista inteligente, o cartão «mesmo produto, mercados diferentes», preços de outros sites, «poupou X», «mais comprados» nem gasto acumulado por dia. — US4.5
- **FR-010**: A pessoa MUST poder mudar de mês com «Mês anterior» e «Mês seguinte»; o mês MUST ficar no URL (`mes=YYYY-MM`) e um valor inválido MUST dar o mês corrente. — US6
- **FR-011**: Durante o carregamento o ecrã MUST mostrar um indicador e nenhum valor; em erro, «Tentar de novo» e nenhum valor antigo. Nada da resposta fica em `localStorage` e o service worker MUST NOT guardar a API. — US3.7, US3.8, constituição IV
- **FR-012**: Os valores monetários MUST circular em cêntimos inteiros e formatar-se só para apresentação (`formatCents`, com cêntimos, D-P4); o saldo da meta MUST ser uma subtração de inteiros, nunca com casas decimais, e acima da meta o texto segue a US1.8. — US1.9, constituição II
- **FR-013**: Cada estado do anel (verde, laranja, vermelho, sem meta) e cada estado vazio MUST ter pelo menos um teste; o axe MUST passar em claro e escuro de 320 a 820 px, sem scroll horizontal a 320 px e com alvos de toque ≥ 44 px. — US5.1, US5.2, constituição V
- **FR-014**: Todo o texto MUST estar em português europeu, conforme a tabela do `README.md` de `design-ux-v2`; sem «poupou», «economizar», «orçamento» nem «limite» como obrigação. — US5.4

### Key Entities

- **Visão geral do mês** (resposta de `overview`): os campos do contrato escrito do backend 014 — `month`, `spent_cents`, `goal_cents`, `goal_pct`, `band`, `monthly_average_cents`, `recent_vs_average_pct`, `average_trend`, `average_months`, `average_min_months`, `purchases_this_month`, `purchases_last_month`, `weeks[]`, `by_merchant[]`, `recent_receipts[]`, `empty`. Os itens e as perguntas que ficam (C10, C12 a C16) estão em `contracts/overview-api.md`.
- **Faixa** (`band`): `ok`, `attention`, `high` ou `none` (sem meta). O cliente só traduz a faixa em texto e estilo.
- **Mês mostrado**: `YYYY-MM` no URL; por omissão o mês corrente de Lisboa.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100 % dos casos dos testes de fronteira (200,00 €, 201,60 €, 202,00 €, 300,00 €, 301,60 € e 302,00 € para uma meta de 400 €), o ecrã mostra a percentagem e a faixa devolvidas pela API, sem diferença (F-183).
- **SC-002**: Uma pessoa percebe, só pelo texto e sem ver cores, em que faixa está e quanto falta para a meta (axe e testes de papel e nome, F-183).
- **SC-003**: Uma conta sem meta ou sem compras nunca vê um valor inventado: zero euros só aparecem quando a API os devolve (F-185).
- **SC-004**: Zero violações do axe no Início com meta, sem meta, sem dados, poucos dados e erro, em claro e escuro, a 320, 375, 430 e 820 px, sem scroll horizontal a 320 px (F-187).
- **SC-005**: O Início faz um único pedido de visão geral por mês e nenhum outro pedido de agregados (F-187).
- **SC-006**: Os tipos do contrato (`schema.d.ts`), `lint`, `typecheck`, Vitest e `e2e:mock` passam.
- **SC-007**: O p95 de `overview` abaixo de 2 s com 5 000 linhas é critério do backend (spec 014), não se mede aqui.

## Assumptions

- Depende das specs 013 (meta no perfil, enviada) e 014 do backend (`overview`, por implementar) e da spec 009 do frontend (navegação, enviada). **Não se implementa antes de a spec 014 do backend estar enviada e de o `schema.d.ts` ser regenerado** (constituição VI: o contrato começa no backend). Até lá faz-se especificação, plano, tarefas e análise.
- O contrato usado é o texto da spec 014 do backend (`spec.md`, `contracts/api.md`, `research.md`); ainda não há OpenAPI publicado. Os campos que faltam são perguntas, não inventos (`contracts/overview-api.md`). A Q7 do backend mudou por decisão da Liz (últimas compras com `status`) e o contrato escrito do backend ainda não o reflete.
- Os cartões da lista e da comparação entre mercados vêm com a spec 015, depois do passo C.
- **A spec 004 («gráficos de série única») não se altera agora**: será atualizada quando esta spec 011 for implementada (US5.5), para registar o anel de três faixas como exceção.
- **Contas existentes (decisão de 2026-10-30):** o onboarding é só para contas novas. As contas anteriores têm onboarding concluído e **meta por definir**; só a definem no Perfil (spec 014 do frontend). O lançamento espera pelo Perfil. Por isso o estado sem meta é frequente e tem de ser um estado de primeira classe.
- Os nomes dos mercados em «Onde gasta mais» e nas últimas compras são o `name` que a API devolve (`MerchantShareOut.name`, `RecentReceiptOut.name`); o cliente não usa `merchantName`.
- Os valores de exemplo dos desenhos (62 %, 38 %, 88 %) e a lista de mercados do protótipo são só ilustração.
- **Identificadores de teste (aprovados pela Liz, 2026-10-31):** a faixa F-86 a F-125 está quase esgotada (F-86 a F-99 na 009, F-100 a F-112 na 013 do backend, F-113 a F-117 na 010; F-118 foi proposto para a migração das contas existentes). O backend 014 usa F-176 a F-182; esta spec usa **F-183 a F-188**, um por história. `traceability.py` não muda.

## Identificadores de teste (constituição VII)

Aprovados pela Liz a 2026-10-31, um por história. Os cenários de cálculo são «Verificado no Backend» (spec 014 do backend).

| ID | O que verifica | Critérios | Tarefas |
|---|---|---|---|
| F-183 | Anel da meta: quatro estados, textos, fronteiras, alternativa em texto, sem recalcular, conta sem meta | US1.1 a US1.14 | T010, T012 |
| F-184 | Média mensal: valor, tendência, fundo suave com texto, sem média, contraste | US2.1 a US2.8 | T014 |
| F-185 | Estados vazios: conta vazia, poucos dados, mês sem compras, carregamento, erro | US3.1 a US3.8 | T016 |
| F-186 | Compras, semanas, mercados e últimas compras; nada do que está fora do produto | US4.1 a US4.6 | T018 |
| F-187 | Qualidade: axe, larguras, texto em português europeu, um só pedido | US5.1 a US5.6 | T022 a T024 |
| F-188 | Navegar entre meses: URL, botões, mês corrente, valor inválido | US6.1 a US6.5 | T003, T020 |
