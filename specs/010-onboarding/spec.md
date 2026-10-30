# Feature Specification: Onboarding

**Feature Branch**: `010-onboarding`

**Created**: 2026-10-30

**Status**: Draft (Fase 0 do plano UX v2: só histórias e critérios de aceitação; sem requisitos técnicos, plano nem tarefas). Clarificada em 2026-10-30.

**Input**: Especificação Funcional v1.4 RF-13, RF-14, RF-12; `Documentation/Super Mercado_—_Plano_de_Implementação_UX_v2.md` (Fase 2, D8); `Documentation/design-ux-v2/Onb1.dc.html` (layout; textos conforme a tabela de substituições do `README.md`). Backend: `../basketIQ-backend/specs/013-perfil-utilizador`.

**Convenção de rastreabilidade**: cada critério cita o RF da Especificação Funcional. Os testes do frontend levam o identificador no nome (`F-xx: …`); o F-xx atribui-se na Fase 8, na faixa da experiência v2 (F-86 a F-125). Teste de cada critério: por criar.

## Clarifications

### Session 2026-10-30

Decisões da Liz (itens 7 e 10 de 2026-10-30) e respostas recomendadas pela skill; todas confirmadas como definitivas pela Liz em 2026-10-30.

- Q: O que se grava ao saltar e ao avançar? → A: **só se grava o que a pessoa confirmou**. «Avançar» confirma o que está no ecrã nesse passo; «Saltar» não grava nada desse passo (decisão da Liz).
- Q: O que diz o passo da meta quando a pessoa escolhe «Ainda não sei»? → A: remove-se «Calculamos pela sua média depois». O texto é «Pode definir a sua meta pessoal mais tarde, nas Definições.» (decisão da Liz).
- Q: «Orçamento» ou «meta»? → A: sempre **meta pessoal** (decisão da Liz).
- Q: De onde vêm os mercados? → A: de `GET /v1/merchants` (os 7 suportados); a lista fixa do protótipo, com 10, não se usa.
- Q: Quem já usa a aplicação sem perfil vê o onboarding? → A: sim, uma vez, e pode saltá-lo.
- Q: As respostas intermédias sobrevivem a um recarregamento? → A: não. As respostas ficam em memória e enviam-se num único `PATCH` ao concluir; ao recarregar volta-se ao passo 1 com os valores já guardados. Nada em `localStorage`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Percurso de quatro passos (Priority: P1)

Depois do consentimento, a pessoa responde a: objetivo, pessoas, mercados e meta pessoal, em `/boas-vindas`.

**Why this priority**: alimenta a meta do Início e o perfil.

**Independent Test**: componente com a API simulada (projeto `mock`).

**Acceptance Scenarios**:

1. **Given** o passo 1, **When** a pessoa escolhe objetivos, **Then** pode escolher vários e «Todas as anteriores» marca os três; marcar os três marca-a e desmarcar um desmarca-a. — RF-14
2. **Given** o passo 2, **When** ajusta, **Then** o valor mostrado é 2, o mínimo é 1 e o máximo é 12, o botão de diminuir fica desativado em 1 e o de aumentar em 12, e o rótulo diz «pessoa» no singular e «pessoas» no plural. — RF-13
3. **Given** o passo 3, **When** a pessoa escolhe mercados, **Then** pode escolher vários e cada um aparece com nome e inicial (sem logótipos); a lista vem de `GET /v1/merchants`, não de uma lista fixa no cliente. — RF-13
4. **Given** o passo 4, **When** a pessoa define a meta, **Then** a barra vai de 50 a 800 €, o valor mostrado é 300 € e o texto diz «por mês» e que pode mudar quando quiser; o termo é sempre «meta pessoal». — RF-13
5. **Given** o passo 4, **When** a pessoa escolhe «Ainda não sei», **Then** a barra fica desativada, o botão passa a «Definir um valor» e o texto diz «Pode definir a sua meta pessoal mais tarde, nas Definições.» — RF-14
6. **Given** o progresso, **When** muda de passo, **Then** a barra mostra 25 %, 50 %, 75 % e 100 % e o texto diz «Passo N de 4». — RF-14
7. **Given** o passo 1, **When** é aberto, **Then** «Voltar» não aparece; nos seguintes volta ao passo anterior sem perder as respostas. — RF-14
8. **Given** o último passo, **When** a pessoa conclui, **Then** os dados confirmados são enviados num único `PATCH`, vê «Tudo pronto» com o texto «Pode editar estas respostas no Perfil a qualquer momento» e o botão «Ir para o início». — RF-14

---

### User Story 2 - Saltar sem gravar (Priority: P1)

**Acceptance Scenarios**:

1. **Given** qualquer passo, **When** a pessoa toca «Saltar», **Then** avança sem gravar nada desse passo (nem 2 pessoas nem 300 €). — RF-14, constituição III
2. **Given** o último passo, **When** toca «Saltar», **Then** o onboarding termina como concluído sem meta. — RF-14
3. **Given** todos os passos saltados, **When** termina, **Then** o `PATCH` leva só `onboarding_completed: true` e o perfil fica sem valores. — RF-14
4. **Given** 3 pessoas confirmadas com «Avançar» e a meta saltada, **When** termina, **Then** só as 3 pessoas ficam guardadas. — RF-14
5. **Given** o passo 2 com o valor 2 mostrado, **When** a pessoa toca «Avançar» sem o alterar, **Then** grava 2, porque «Avançar» confirma o que o ecrã mostra. — RF-14
6. **Given** o passo 1 (objetivos) ou 3 (mercados) sem nada escolhido, **When** a pessoa toca «Avançar», **Then** não grava nenhum valor desse passo. — RF-14

---

### User Story 3 - Guarda de rota (Priority: P1)

**Acceptance Scenarios**:

1. **Given** uma pessoa autenticada, com consentimento da política atual e sem onboarding concluído, **When** abre qualquer rota privada, **Then** vai para `/boas-vindas`. — RF-14
2. **Given** a ordem, **When** a política mudou, **Then** o consentimento vem antes do onboarding. — RF-12, RF-14, D8
3. **Given** o onboarding concluído ou saltado, **When** a pessoa volta à aplicação, **Then** não é interrompida. — RF-14
4. **Given** o onboarding concluído, **When** abre `/boas-vindas`, **Then** vai para o Início. — RF-14
5. **Given** a leitura do perfil em curso, **When** a guarda decide, **Then** não há piscar do Início antes de redirecionar. — RF-14
6. **Given** a leitura do perfil falha, **When** a guarda decide, **Then** a pessoa não fica bloqueada fora da aplicação. — RF-14
7. **Given** uma conta com compras e sem perfil, **When** entra, **Then** vê o onboarding uma vez, como qualquer outra, e pode saltá-lo. — RF-14

---

### User Story 4 - Refazer sem perder dados e privacidade (Priority: P1)

**Acceptance Scenarios**:

1. **Given** um perfil guardado, **When** a pessoa refaz o percurso, **Then** os passos aparecem com os valores guardados e saltar não os apaga. — RF-14
2. **Given** um recarregamento a meio do percurso, **When** a pessoa volta, **Then** regressa ao passo 1 com os valores já guardados e sem respostas intermédias. — RF-14
3. **Given** o envio falha, **When** a pessoa conclui, **Then** vê um erro acionável, mantém as respostas e pode repetir sem duplicar nada. — RF-14
4. **Given** o service worker, **When** o onboarding corre, **Then** nenhuma resposta da API fica em cache e nada fica em `localStorage`. — constituição IV
5. **Given** o consentimento da política atual em falta (403 `privacy_consent_required`), **When** a pessoa tenta guardar, **Then** vê o motivo e o caminho para aceitar. — RF-12, RF-13

---

### User Story 5 - Acessibilidade e qualidade (Priority: P1)

**Acceptance Scenarios**:

1. **Given** cada passo, **When** corre o axe em claro e escuro de 320 a 820 px, **Then** não há violações. — §8, §10
2. **Given** a mudança de passo, **When** acontece, **Then** o foco vai para o título do passo e o leitor de ecrã anuncia «Passo N de 4». — §8
3. **Given** as escolhas, **When** são lidas, **Then** objetivos e mercados são caixas de seleção com nome, e o estado não depende só da cor ou da moldura. — §8
4. **Given** o controlo de pessoas e a barra da meta, **When** usados por teclado, **Then** têm nome acessível e anunciam o valor. — §8
5. **Given** todos os alvos de toque, **When** medidos, **Then** têm pelo menos 44 px. — §8
6. **Given** os textos, **When** revistos, **Then** estão em português europeu (por exemplo «Saltar», «Onde costuma fazer compras?», «Quantas pessoas vivem em sua casa?»). — §8

### Edge Cases

- Nenhum mercado escolhido é válido.
- Meta fora de 50–800 € não é possível pela barra; a API recusa-a de qualquer forma.
- «Economizar nas compras» é um objetivo; não leva a texto de «poupança» (a palavra «poupou» está fora do produto).

## Requirements *(mandatory)*

*Por escrever em `/speckit-plan`; a Fase 0 cobre só histórias e critérios.*

## Success Criteria *(mandatory)*

*Por escrever. O plano pede: conta nova passa pelo onboarding, refazer o fluxo não perde dados, testes de contrato e axe verdes.*

## Assumptions

- Depende da spec 013 do backend e da regeneração de `schema.d.ts` (`pnpm gen:api`).
