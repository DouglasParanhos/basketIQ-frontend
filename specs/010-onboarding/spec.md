# Feature Specification: Onboarding

**Feature Branch**: `010-onboarding`

**Created**: 2026-10-30

**Status**: Planeada e com tarefas (plano, investigação, contratos e `tasks.md` de 2026-10-30); decisões P1 a P5, C1 e I3 da Liz aplicadas em 2026-10-30. Clarificada em 2026-10-30.

**Input**: Especificação Funcional v1.4 RF-13, RF-14, RF-12; `Documentation/Super Mercado_—_Plano_de_Implementação_UX_v2.md` (Fase 2, D8); `Documentation/design-ux-v2/Onb1.dc.html` (layout; textos conforme a tabela de substituições do `README.md`). Backend: `../basketIQ-backend/specs/013-perfil-utilizador`.

**Convenção de rastreabilidade**: cada critério cita o RF da Especificação Funcional. Os testes do frontend levam o identificador no nome (`F-xx: …`); os identificadores são **F-113 a F-117, um por história** (tabela «Identificadores de teste» no fim). Os cenários do perfil e dos mercados são «Verificado no Backend» (F-100 a F-112).

## Clarifications

### Session 2026-10-30

Decisões da Liz (itens 7 e 10 de 2026-10-30) e respostas recomendadas pela skill; todas confirmadas como definitivas pela Liz em 2026-10-30.

- Q: O que se grava ao saltar e ao avançar? → A: **só se grava o que a pessoa confirmou**. «Avançar» confirma o que está no ecrã nesse passo; «Saltar» não grava nada desse passo (decisão da Liz).
- Q: O que diz o passo da meta quando a pessoa escolhe «Ainda não sei»? → A: remove-se «Calculamos pela sua média depois». O texto é «Pode definir a sua meta pessoal mais tarde, nas Definições.» (decisão da Liz).
- Q: «Orçamento» ou «meta»? → A: sempre **meta pessoal** (decisão da Liz).
- Q: De onde vêm os mercados? → A: de `GET /v1/merchants` (os 7 suportados); a lista fixa do protótipo, com 10, não se usa.
- Q: Quem já usa a aplicação sem perfil vê o onboarding? → A: sim, uma vez, e pode saltá-lo.
- Q: Quem já concluiu volta a `/boas-vindas`? → A: não, vai para o Início (decisão da Liz, P3). **Refazer as respostas faz-se no Perfil das Definições** (spec 014). `/boas-vindas` só mostra valores guardados a quem tem perfil sem conclusão.
- Q: Os nomes dos mercados do onboarding? → A: só o onboarding usa os nomes de `GET /v1/merchants`; `src/lib/format.ts` (`merchantName`, `MERCHANT_NAMES`, `MERCHANT_OPTIONS`) mantém-se até às specs 012 e 013, porque também mostra «Outra loja» e lojas históricas que a API não devolve (decisão da Liz, P1).
- Q: Texto do objetivo de gastar menos? → A: «Gastar menos nas compras»; nunca «poupar», «economizar» nem «poupou». As descrições dos objetivos não prometem a Lista nem a comparação de preços (decisão da Liz, P2). «Quero tudo isso» mantém-se.
- Q: Inicial de cada mercado? → A: a primeira letra do nome; «EC» para El Corte Inglés (regra: se a primeira palavra for um artigo — «El», «La», «Los», «Las», «O», «A», «Os», «As» — e houver segunda palavra, usam-se as primeiras letras das duas). O nome fica sempre visível ao lado (decisão da Liz, P4).
- Q: Constituição III e «Avançar»? → A: «Avançar» confirma o que o ecrã mostra e grava-o; a constituição do frontend passa à 1.0.2 («envia apenas os campos que a pessoa confirmou ou alterou») (decisão da Liz, C1).
- Q: Onde fica a guarda? → A: acima do AppShell: enquanto decide, não aparece a barra de navegação (decisão da Liz, I3).
- Q: As respostas intermédias sobrevivem a um recarregamento? → A: não. As respostas ficam em memória e enviam-se num único `PATCH` ao concluir; ao recarregar volta-se ao passo 1 com os valores já guardados. Nada em `localStorage`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Percurso de quatro passos (Priority: P1)

Depois do consentimento, a pessoa responde a: objetivo, pessoas, mercados e meta pessoal, em `/boas-vindas`.

**Why this priority**: alimenta a meta do Início e o perfil.

**Independent Test**: componente com a API simulada (projeto `mock`).

**Acceptance Scenarios**:

1. **Given** o passo 1, **When** a pessoa escolhe objetivos, **Then** vê «Organizar as minhas finanças», «Ajuda com a lista de compras», «Gastar menos nas compras» e «Todas as anteriores», pode escolher vários, e «Todas as anteriores» marca os três; marcar os três marca-a e desmarcar um desmarca-a. As descrições não prometem a Lista nem a comparação de preços. — RF-14
2. **Given** o passo 2, **When** ajusta, **Then** o valor mostrado é 2, o mínimo é 1 e o máximo é 12, o botão de diminuir fica desativado em 1 e o de aumentar em 12, e o rótulo diz «pessoa» no singular e «pessoas» no plural. — RF-13
3. **Given** o passo 3, **When** a pessoa escolhe mercados, **Then** pode escolher vários e cada um aparece com nome e inicial (primeira letra; «EC» para El Corte Inglés), sem logótipos; a lista vem de `GET /v1/merchants`, não de uma lista fixa no cliente. — RF-13
4. **Given** o passo 4, **When** a pessoa define a meta, **Then** a barra vai de 50 a 800 €, o valor mostrado é 300 € e o texto diz «por mês» e que pode mudar quando quiser; o termo é sempre «meta pessoal». — RF-13
5. **Given** o passo 4, **When** a pessoa escolhe «Ainda não sei», **Then** a barra fica desativada, o botão passa a «Definir um valor» e o texto diz «Pode definir a sua meta pessoal mais tarde, nas Definições.» — RF-14
6. **Given** o progresso, **When** muda de passo, **Then** a barra mostra 25 %, 50 %, 75 % e 100 % e o texto visível diz «Passo N de 4». — RF-14
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
7. **Given** um passo já confirmado com «Avançar», **When** a pessoa volta a ele com «Voltar» e toca «Saltar», **Then** a confirmação anterior mantém-se (saltar não retira o que ela já confirmou). — RF-14

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
8. **Given** uma pessoa autenticada cuja guarda ainda está a decidir, **When** o perfil carrega, **Then** a barra de navegação não aparece (a guarda está acima do AppShell) e só se vê o indicador de carregamento. — RF-14

---

### User Story 4 - Valores guardados, falhas e privacidade (Priority: P1)

**Acceptance Scenarios**:

1. **Given** uma pessoa que já concluiu o onboarding, **When** quer alterar as respostas, **Then** fá-lo no Perfil das Definições (spec 014) e `/boas-vindas` leva-a ao Início; **Given** um perfil com valores guardados mas sem conclusão, **When** abre o percurso, **Then** os passos aparecem com os valores guardados e saltar não os apaga. — RF-14
2. **Given** um recarregamento a meio do percurso, **When** a pessoa volta, **Then** regressa ao passo 1 com os valores já guardados e sem respostas intermédias. — RF-14
3. **Given** o envio falha, **When** a pessoa conclui, **Then** vê um erro acionável, mantém as respostas e pode repetir sem duplicar nada. — RF-14
4. **Given** o service worker, **When** o onboarding corre, **Then** nenhuma resposta da API fica em cache e nada fica em `localStorage`. — constituição IV
5. **Given** o consentimento da política atual em falta (403 `privacy_consent_required`), **When** a pessoa tenta guardar, **Then** vê o motivo e o caminho para aceitar. — RF-12, RF-13

---

### User Story 5 - Acessibilidade e qualidade (Priority: P1)

**Acceptance Scenarios**:

1. **Given** cada passo, **When** corre o axe em claro e escuro de 320 a 820 px, **Then** não há violações. — §8, §10
2. **Given** a mudança de passo, **When** acontece, **Then** o foco vai para o título do passo (`<h1>`), que tem como descrição acessível o texto «Passo N de 4», por isso o leitor de ecrã anuncia o título e o passo. — §8
3. **Given** as escolhas, **When** são lidas, **Then** objetivos e mercados são caixas de seleção com nome, e o estado não depende só da cor ou da moldura. — §8
4. **Given** o controlo de pessoas e a barra da meta, **When** usados por teclado, **Then** têm nome acessível e anunciam o valor. — §8
5. **Given** todos os alvos de toque, **When** medidos, **Then** têm pelo menos 44 px. — §8
6. **Given** os textos, **When** revistos, **Then** estão em português europeu (por exemplo «Saltar», «Onde costuma fazer compras?», «Quantas pessoas vivem em sua casa?»). — §8

### Edge Cases

- Nenhum mercado escolhido é válido.
- Meta fora de 50–800 € não é possível pela barra; a API recusa-a de qualquer forma.
- «Gastar menos nas compras» é um objetivo; não leva a texto de «poupança» nem de «economia» (as palavras «poupar», «economizar» e «poupou» estão fora do produto).
- A falha de `GET /v1/merchants` não impede o percurso: o passo mostra «Tentar de novo» e pode ser saltado.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A aplicação MUST ter a rota `/boas-vindas`, em ecrã inteiro (sem barra de navegação), com quatro passos pela ordem objetivo, pessoas, mercados e meta pessoal, mais o ecrã «Tudo pronto». — US1, RF-14
- **FR-002**: O percurso MUST enviar um único `PATCH /v1/me/profile` ao concluir ou saltar o último passo, só com o que a pessoa confirmou («Avançar») e sempre com `onboarding_completed: true`. — US1, US2, RF-14, constituição III
- **FR-003**: «Saltar» MUST NOT gravar nada do passo; «Ainda não sei» MUST NOT enviar a meta; um passo de objetivos ou mercados sem escolhas MUST NOT enviar valor. O corpo MUST NOT conter `null`, `[]` nem valores sugeridos não confirmados. — US2
- **FR-004**: Os mercados MUST vir de `GET /v1/merchants` (nomes da API); a inicial é a primeira letra, com a regra do artigo para «EC». — US1.3, RF-13
- **FR-005**: A meta MUST estar entre 50 € e 800 € e circular em cêntimos inteiros (`euros * 100`); as pessoas entre 1 e 12. — US1.2, US1.4, RF-13, constituição II
- **FR-006**: Uma guarda MUST enviar para `/boas-vindas` quem está autenticado, consentiu a política atual e não concluiu o onboarding, sem mostrar o Início antes, sem mostrar a barra de navegação enquanto decide e sem bloquear a pessoa se a leitura do perfil falhar. — US3, RF-12, RF-14
- **FR-007**: Quem já concluiu MUST ser levado de `/boas-vindas` para o Início; refazer as respostas é do Perfil (spec 014). — US3.4, US4.1
- **FR-008**: Em caso de falha do envio, o percurso MUST manter as respostas, mostrar um erro acionável e permitir repetir sem duplicar; um 403 `privacy_consent_required` MUST mostrar o motivo e o caminho para `/privacidade`. — US4
- **FR-009**: As respostas MUST ficar só em memória; o percurso MUST NOT escrever em `localStorage` nem `sessionStorage` e o service worker MUST NOT guardar respostas da API. — US4.2, US4.4, constituição IV
- **FR-010**: Cada passo MUST cumprir WCAG 2.2 AA em claro e escuro de 320 a 820 px, com caixas de seleção com nome, alvos ≥ 44 px, foco no título e estado nunca só por cor. — US5, constituição V
- **FR-011**: Todo o texto MUST estar em português europeu, conforme a tabela do `README.md` de `design-ux-v2` e `contracts/copy.md`. — US5.6

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma conta nova passa pelo onboarding antes de qualquer rota privada, e uma conta que concluiu ou saltou nunca é interrompida de novo (testes F-115).
- **SC-002**: Em 100 % dos testes de envio (F-114), o corpo do `PATCH` contém apenas o que foi confirmado; tudo saltado produz exatamente `{ "onboarding_completed": true }`.
- **SC-003**: Uma pessoa chega a «Tudo pronto» em 4 toques em «Saltar», sem escrever nada.
- **SC-004**: Zero violações do axe em cada passo e em «Tudo pronto», em claro e escuro, a 320, 375, 430 e 820 px (F-117), sem scroll horizontal a 320 px.
- **SC-005**: Nenhuma escrita em `localStorage` nem `sessionStorage` durante o percurso, e um único `PATCH` por percurso concluído (F-116, F-113).
- **SC-006**: Os tipos do contrato (`schema.d.ts`), `lint`, `typecheck`, Vitest e `e2e:mock` passam.

## Assumptions

- Depende da spec 013 do backend (enviada a 2026-10-30) e do `schema.d.ts` regenerado com `pnpm gen:api` (feito a 2026-10-30).
- **Lista de mercados (decisão de 2026-10-30):** no onboarding a API (`GET /v1/merchants`) é a única fonte dos nomes dos mercados e a lista do protótipo não existe. `merchantName`, `MERCHANT_NAMES` e `MERCHANT_OPTIONS` de `src/lib/format.ts` **não se alteram nesta spec**: também mostram «Outra loja» e lojas históricas que a API não devolve, e passam a usar os nomes da API quando as specs 012 (Talões) e 013 (Adicionar) reescreverem esses ecrãs.
- Os identificadores de teste do perfil e dos mercados são os da spec 013 do backend (F-100 a F-112), citados aqui com «Verificado no Backend» ao implementar.
- Os cenários manuais com o backend real exigem a **T032 do backend** aplicada (migração `e5a8b3d1f2c7` na base de desenvolvimento) e a imagem da API reconstruída; sem isso o perfil responde com erro, a guarda deixa passar e o onboarding não aparece.

## Identificadores de teste (constituição VII)

Atribuídos a 2026-10-30 dentro da faixa da experiência v2 (F-86 a F-125), um por história; F-176 a F-205 ficam reservados à continuação da UX v2 (Funcional §12.4). Os testes do frontend levam o identificador no nome (`F-113: …`).

| ID | O que verifica | Critérios | Tarefas |
|---|---|---|---|
| F-113 | Percurso de quatro passos: objetivos, pessoas, mercados (API), meta, progresso, «Voltar», «Tudo pronto», um só `PATCH` | US1.1 a US1.8 | T007, T010 |
| F-114 | Só se grava o que a pessoa confirmou: corpo do `PATCH` em cada combinação de «Avançar», «Saltar» e «Ainda não sei» | US2.1 a US2.7 | T007, T014 |
| F-115 | Guarda de rota: sem conclusão vai para `/boas-vindas`; consentimento primeiro; sem piscar nem barra; falha não bloqueia; concluído vai para o Início | US3.1 a US3.8 | T016 |
| F-116 | Valores guardados à vista, recarregar volta ao passo 1, falha mantém as respostas, nada em `localStorage`, consentimento em falta | US4.1 a US4.5 | T019 |
| F-117 | Acessibilidade: papéis, nomes, foco, anúncio do passo, axe em claro e escuro de 320 a 820 px, alvos ≥ 44 px, texto em português europeu | US5.1 a US5.6 | T021, T022 |
