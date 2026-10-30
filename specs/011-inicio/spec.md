# Feature Specification: Início

**Feature Branch**: `011-inicio`

**Created**: 2026-10-30

**Status**: Draft (Fase 0 do plano UX v2: só histórias e critérios de aceitação; sem requisitos técnicos, plano nem tarefas)

**Input**: Especificação Funcional v1.4 RF-15, RF-13; `Documentation/Super Mercado_—_Plano_de_Implementação_UX_v2.md` (Fase 3, D4, D5, D7); `Documentation/design-ux-v2/HomeF.dc.html`, `HomeG.dc.html` (layout; textos conforme a tabela de substituições do `README.md`). Backend: `../basketIQ-backend/specs/014-visao-geral-inicio`.

**Convenção de rastreabilidade**: cada critério cita o RF da Especificação Funcional. Os testes do frontend levam o identificador no nome (`F-xx: …`); o F-xx atribui-se na Fase 8, na faixa da experiência v2 (F-86 a F-125). Teste de cada critério: por criar.

**Fora desta spec (decisão de 2026-10-30):** o cartão da lista inteligente e o cartão «mesmo produto, mercados diferentes» só se constroem depois do passo C e fazem parte da spec 015. Nesta fase o Início não os tem, mesmo com a opção da lista ligada.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Anel da meta pessoal (Priority: P1)

**Why this priority**: é o centro do ecrã e a parte com mais risco de tom.

**Independent Test**: componente do anel com os quatro estados e dados simulados.

**Acceptance Scenarios**:

1. **Given** meta de 400 € e gasto de 152 €, **When** o Início abre, **Then** o anel mostra 38 %, a faixa verde, «Tranquilo · saldo da meta: € 248» e «A sua meta pessoal: € 400». — RF-15
2. **Given** gasto de 248 €, **When** abre, **Then** mostra 62 %, a faixa laranja e «Quase lá · saldo da meta: € 152». — RF-15
3. **Given** gasto de 352 €, **When** abre, **Then** mostra 88 %, a faixa vermelha e «Reta final · saldo da meta: € 48». — RF-15
4. **Given** nenhuma meta, **When** abre, **Then** o anel está vazio, mostra «—», «Sem meta pessoal definida» e o botão «Definir a minha meta pessoal». — RF-15
5. **Given** o botão «Definir a minha meta pessoal», **When** a pessoa o toca, **Then** vai para a edição da meta. — RF-13, RF-15 — [NEEDS CLARIFICATION: destino (Definições › Perfil em edição ou passo 4 do onboarding)]
6. **Given** qualquer faixa, **When** é lida por leitor de ecrã, **Then** o anel tem alternativa em texto («Anel verde, 38 % da meta usada») e a cor nunca é o único sinal. — §8, RF-15
7. **Given** o ecrã, **When** é mostrado, **Then** a nota «A meta pessoal é um objetivo seu, não um limite.» está sempre visível. — RF-13, RF-15
8. **Given** gasto acima da meta, **When** abre, **Then** o texto mantém o tom positivo, sem linguagem de perda ou de saldo negativo. — RF-15 — [NEEDS CLARIFICATION: texto quando o gasto passa 100 %]
9. **Given** valores em cêntimos, **When** são mostrados, **Then** a formatação é só de apresentação (`src/lib/format.ts`). — constituição II
10. **Given** respostas do backend para uma meta de 400 € com gasto de 200,00 €, 201,60 €, 202,00 €, 300,00 €, 301,60 € e 302,00 €, **When** o Início abre, **Then** o ecrã mostra 50 %, 50 %, 51 %, 75 %, 75 % e 76 %, e as faixas verde, verde, laranja, laranja, laranja e vermelha (teste de fronteira; verde até 50 % inclusive, laranja acima de 50 % até 75 % inclusive, vermelho acima de 75 %). — RF-15
11. **Given** `goal_pct` e `band` devolvidos pelo backend, **When** o anel é desenhado, **Then** o cliente mostra os dois valores tal como vêm e não recalcula a faixa; a faixa é a da percentagem arredondada que o ecrã mostra. — RF-15

---

### User Story 2 - Média mensal (Priority: P1)

**Acceptance Scenarios**:

1. **Given** média disponível e gasto abaixo, **When** abre, **Then** o cartão mostra o valor, «Últimos 2 meses: 7 % abaixo da média» e fundo suave verde, com o texto a dizer o mesmo. — RF-15
2. **Given** média disponível e gasto acima, **When** abre, **Then** o fundo é suave vermelho e o texto diz «12 % acima». — RF-15 — [NEEDS CLARIFICATION: a leitura de «acima da média» a vermelho pode soar a reprimenda; confirmar o tom]
3. **Given** média disponível e gasto próximo dela, **When** abre, **Then** o cartão é neutro e diz «na média». — RF-15 — [NEEDS CLARIFICATION: intervalo de «na média»]
4. **Given** menos meses do que o mínimo, **When** abre, **Then** mostra «€ —» e «Aparece com 2 meses de histórico», sem fundo colorido. — RF-15
5. **Given** o fundo colorido, **When** medido, **Then** o contraste do texto é pelo menos 4,5:1 em claro e escuro. — §8

---

### User Story 3 - Estados vazios (Priority: P1)

**Acceptance Scenarios**:

1. **Given** uma conta sem nenhuma compra confirmada, **When** abre, **Then** vê o ecrã final com cartões tracejados, «A aguardar o seu primeiro talão», «Quanto mais talões registar, mais aprendemos sobre as suas compras» e o botão «Adicionar talão». — RF-15, F-21
2. **Given** o botão «Adicionar talão», **When** é tocado, **Then** vai para Adicionar. — RF-15
3. **Given** poucos dados, **When** abre, **Then** cada cartão diz o que falta («Aparece com 2 meses de histórico», «0/2 meses» onde houver progresso). — RF-15, RF-11
4. **Given** uma conta com compras e sem compras no mês, **When** abre, **Then** o mês aparece com zeros, não o estado de conta vazia. — RF-15 — [NEEDS CLARIFICATION: distinção entre `empty` e mês sem compras]
5. **Given** o estado sem dados, **When** corre o axe, **Then** não há violações. — §8, §10
6. **Given** os cartões tracejados, **When** lidos por leitor de ecrã, **Then** são anunciados como ainda indisponíveis e não como valores. — RF-11

---

### User Story 4 - Gasto, mercados e últimas compras (Priority: P2)

**Acceptance Scenarios**:

1. **Given** compras no mês e no anterior, **When** abre, **Then** vê «Compras no mês 7» e «Mês passado: 11». — RF-15
2. **Given** o gasto por semana, **When** abre, **Then** vê as semanas com valor e a média por semana, e uma alternativa em tabela. — RF-15, RF-11, §8
3. **Given** «Onde gasta mais», **When** abre, **Then** vê cada mercado com valor e percentagem em texto e inicial, sem depender da cor da barra. — RF-15, §8
4. **Given** «Últimas compras», **When** abre, **Then** vê as mais recentes e «Ver todas» leva a `/compras`. — RF-15
5. **Given** o ecrã, **When** é revisto, **Then** não mostra preços de outros sites, «poupou X», «mais comprados» nem gasto acumulado por dia, nem os cartões da lista e da comparação entre mercados. — RF-15

---

### User Story 5 - Qualidade (Priority: P1)

**Acceptance Scenarios**:

1. **Given** os quatro estados do anel e os estados vazios, **When** correm os testes, **Then** cada um tem um teste. — RF-15
2. **Given** o Início, **When** corre o axe em claro e escuro de 320 a 820 px, **Then** não há violações. — §8, §10
3. **Given** o endpoint de visão geral, **When** mede com 5 000 linhas, **Then** p95 < 2 s. — §10 (medido no backend)
4. **Given** o texto, **When** é revisto, **Then** não usa linguagem de perda, «limite» como obrigação ou «poupou», e está em português europeu conforme a tabela do `README.md` (por exemplo «Quase lá», «A aguardar», «A sua meta»). — RF-13, §8
5. **Given** o anel de três faixas, **When** comparado com a spec 004 («gráficos de série única»), **Then** a exceção está registada e a spec 004 atualizada. — D7

### Edge Cases

- Sem rede: o Início mostra o estado de erro com ação, nunca valores antigos como se fossem atuais (o service worker não guarda a API).
- Mês com a faixa no limite exato: decidido (verde até 50 % inclusive, laranja até 75 % inclusive); ver os testes de fronteira acima e na spec 014 do backend.

## Requirements *(mandatory)*

*Por escrever em `/speckit-clarify` e `/speckit-plan`; a Fase 0 cobre só histórias e critérios.*

## Success Criteria *(mandatory)*

*Por escrever. O plano pede: os 4 estados do anel e os vazios com testes; axe claro e escuro; p95 de `overview` < 2 s com 5 000 linhas.*

## Assumptions

- Depende das specs 013 (meta) e 014 do backend e da spec 009 do frontend (navegação).
- Os cartões da lista e da comparação entre mercados vêm com a spec 015, depois do passo C.
- **A spec 004 («gráficos de série única») não se altera agora**: será atualizada quando esta spec 011 for implementada (US5.5), para registar o anel de três faixas como exceção.
