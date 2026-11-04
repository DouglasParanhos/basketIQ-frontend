---

description: "Tarefas da spec 011: Início"
---

# Tasks: Início

> **Atualizado a 04/11/2026.** O desenho aprovado a 03/11 mudou as cores do anel (verde, dourado e dourado; vermelho só acima de 100 %), o texto acima da meta («Acima da meta · X € além da meta»), o rótulo do anel («Gasto no mês») e trocou o token laranja `--color-warn` (D-P3) pelo ouro `#b8860b`. As palavras «Tranquilo / Quase lá / Reta final» mantêm-se (o canvas `HomeG` tem-nas) e vêm da banda da API. Onde o texto abaixo diverge, vale esta nota; o histórico das decisões não se apaga.

**Input**: `/specs/011-inicio/` — [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Estado (2026-10-31): implementada e verificada** (T001 passou: `OverviewOut` publicado e tipos gerados; lint e tipos limpos, Vitest e `e2e:mock` verdes; capturas em `Documentation/capturas-inicio/`); só a jornada `stack` (T028, manual) não foi corrida. Antes: BLOQUEADA até a **T001** passar. A T001 verifica que o backend publicou `overview` no OpenAPI, que os tipos gerados batem com o contrato escrito do backend (`contracts/overview-api.md`) e que `status` das últimas compras vem como enum (C10). Se falhar, parar e escrever `Documentation/PENDENTE_…md`; não se inventam tipos nem campos (R1).

**Tests**: pedidos (constituição VII; testes antes do código). Identificadores aprovados pela Liz (D-P6; o backend 014 usa F-176 a F-182), um por história: `F-183` US1, `F-184` US2, `F-185` US3, `F-186` US4, `F-187` US5, `F-188` US6. O nome de cada teste novo começa por `F-183:` … `F-188:`. Os cenários de cálculo (faixas, média, semanas) são «Verificado no Backend». `scripts/traceability.py` do backend não muda.

**Comandos**: `corepack pnpm@9 <script>` no PowerShell ou Git Bash (não há `pnpm` no PATH nem WSL). Vitest: `corepack pnpm@9 exec vitest run --maxWorkers=4` (um ficheiro de cada vez: `… <ficheiro>`). Playwright (`e2e:mock`) precisa de `pnpm` no PATH (atalho `pnpm.cmd` → `corepack pnpm@9`). Só dados sintéticos. Não há commits nesta lista: o commit é da Liz, depois de `/simplify` (T034).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode correr em paralelo (ficheiros diferentes, sem dependência de tarefa por acabar)
- **[Story]**: US1 anel da meta · US2 média mensal · US3 estados vazios · US4 gasto, mercados e últimas compras · US5 qualidade · US6 navegar entre meses

## Phase 1: Setup e bloqueio de contrato

- [X] T001 **BLOQUEIO.** Verificar, sem alterar código, que: (a) `src/api/schema.d.ts` tem `"/v1/analytics/overview"` com o parâmetro `month` (correr `corepack pnpm@9 gen:api` primeiro, se o `openapi.json` do backend tiver mudado; não editar o `schema.d.ts` à mão); (b) o tipo da resposta bate com `contracts/overview-api.md`: `month`, `average_trend`, `average_months`, `average_min_months`, os itens de `weeks`, `by_merchant` e `recent_receipts` e, nestes, o `status` como `ReceiptStatus`; (c) `/compras/:id` serve compras em revisão e em processamento (C14). As decisões D-P1 a D-P12 estão tomadas (`plan.md`); D-P13 e D-P14 têm texto proposto. Registar o resultado e o nome real do tipo (`Schemas["…"]`) em `research.md` (R1) e atualizar `contracts/overview-api.md` e `data-model.md` com a forma real. **Se algo faltar, parar e não avançar para a T003**
- [X] T002 Confirmar a linha de base sem alterar ficheiros: `lint`, `typecheck`, `exec vitest run --maxWorkers=4` e `e2e:mock`; registar o resultado

---

## Phase 2: Foundational (bloqueia as histórias; depende da T001)

- [X] T003 [P] Escrever `src/lib/month.test.ts` (novo): `currentMonth(now)` devolve o `YYYY-MM` da hora de Lisboa, com instantes sintéticos em que o fuso decide o mês (`2026-09-30T23:30:00Z` → `2026-10`, porque em setembro Lisboa está em UTC+1 e já é 1 de outubro; `2026-10-31T23:30:00Z` → `2026-10`, porque depois de 25 de outubro Lisboa está em UTC+0 e ainda é 31 de outubro); confirmar cada valor com `lisbonToday` antes de o escrever no teste); `parseMonth("2026-09")` → `"2026-09"`, `"lixo"`, `"2026-13"`, `"2026-00"`, `"2026-9"`, `""` e `null` → `null`; `shiftMonth("2026-01", -1)` → `"2025-12"` e `shiftMonth("2026-12", 1)` → `"2027-01"`; `monthLabel("2026-10", "2026-10")` → «Este mês» e `monthLabel("2026-09", "2026-10")` → «setembro de 2026»; `monthRange("2026-10")` → «1 – 31 out. 2026», `monthRange("2026-02")` → «1 – 28 fev. 2026». `F-188:`
- [X] T004 Criar `src/lib/month.ts` com `currentMonth`, `parseMonth`, `shiftMonth`, `monthLabel` e `monthRange`, reaproveitando `lisbonToday` de `src/lib/period.ts` e `formatMonth` de `src/lib/format.ts`; sem bibliotecas novas. Depende de T003
- [X] T005 [P] Acrescentar a `src/test/fixtures.ts`, tipados com `Schemas["<tipo da T001>"]`, respostas **sintéticas** de `overview` (cêntimos inteiros): `overviewGreen` (meta 40000, gasto 15200, `goal_pct` 38, `band` `ok`), `overviewOrange` (24800, 62, `attention`), `overviewRed` (35200, 88, `high`), `overviewOver` (45200, 113, `high`), `overviewNoGoal` (`goal_cents` e `goal_pct` nulos, `band` `none`, gasto 24800), `overviewFewData` (`monthly_average_cents`, `recent_vs_average_pct` e `average_trend` nulos, `average_months` 0), `overviewNoTrend` (média presente, `recent_vs_average_pct` e `average_trend` nulos, `average_months` 2), `overviewEmpty` (`empty` verdadeiro, gasto 0, listas vazias), `overviewZeroMonth` (`empty` falso, gasto 0, meta definida) e a função `overviewFor(spent, goal)` para os seis casos de fronteira (200,00, 201,60, 202,00, 300,00, 301,60 e 302,00 € para 400 €) com os `goal_pct` e `band` que a spec 014 do backend define (50 `ok`, 50 `ok`, 51 `attention`, 75 `attention`, 75 `attention`, 76 `high`). Os itens de `weeks`, `by_merchant` e `recent_receipts` seguem a forma real da T001; `overviewGreen` leva uma compra confirmada, uma que requer revisão (com `total_cents` nulo) e uma em processamento, com `status` `REVIEW_REQUIRED` e `RECEIVED`, e `average_trend` coerente com `recent_vs_average_pct`
- [X] T006 Em `src/test/server.ts`, servir por omissão `GET /v1/analytics/overview` com `overviewGreen` (sem isto, os testes que abrem `/` falham com `onUnhandledRequest: "error"`, R11). Exportar `serveOverview(body, options)` como `serveProfile`. Depende de T005
- [X] T007 [P] Em `e2e/mock/api.ts`: `FakeState.overview` (por omissão com meta e dados), `overviewDelayMs`, `overviewFail`, contador `overviewRequests`, e o handler de `GET /v1/analytics/overview` que aceita `month` e devolve a resposta de `FakeState.overview` (estados: com meta, sem meta, vazio, poucos dados, acima da meta). O mock é independente de `src/` (como o resto)
- [X] T008 Criar `src/features/home/useOverview.ts`: `useOverview(month)` com `useQuery` (`["overview", month]`, `staleTime` 30 s, pelo cliente tipado `api` e `unwrap`, `month` sempre enviado). Depende de T001
- [X] T009 **(D-P3 aprovada)** Em `src/styles.css`, acrescentar `--color-warn` (laranja #c2691a no claro; par escuro derivado) e `--color-warn-soft` para o chip, e mapear em `@theme` como os tokens vizinhos; medir a razão de contraste de cada par (traço sobre `--color-paper` ≥ 3:1; texto do chip ≥ 4,5:1) em claro e escuro e registá-la em `research.md` (R4). Acrescentar `src/lib/contrast.test.ts` (`F-187:`), que lê os valores de `src/styles.css` e calcula a razão de contraste dos pares (traço do anel e das barras sobre `--color-paper`; texto do chip sobre `--color-warn-soft`), em claro e escuro, e falha abaixo de 3:1 e 4,5:1: o axe não mede o contraste de gráficos

**Checkpoint**: `corepack pnpm@9 lint && corepack pnpm@9 typecheck && corepack pnpm@9 exec vitest run --maxWorkers=4` verdes; os testes existentes continuam verdes com o `overview` por omissão.

---

## Phase 3: User Story 1 — Anel da meta pessoal (P1) 🎯 MVP

**Goal**: o anel mostra faixa, percentagem, texto e saldo tal como a API os devolve, com a alternativa em texto e a nota fixa.

**Independent Test**: componente do anel com os quatro estados e as respostas sintéticas (projeto Vitest).

- [X] T010 [P] [US1] Escrever `src/features/home/ringView.test.ts` (novo; `F-183:`): `ringView(overview, isCurrentMonth)` é pura e não decide a faixa. `ok` com 15200/40000 → rótulo «Tranquilo», saldo «248,00 €», texto «Tranquilo · saldo da meta: 248,00 €», traço 38 % do perímetro, `ariaLabel` «Anel verde, 38 % da meta usada»; `attention` 24800 → «Quase lá · saldo da meta: 152,00 €», «Anel laranja, 62 % da meta usada»; `high` 35200 → «Reta final · saldo da meta: 48,00 €», «Anel vermelho, 88 % da meta usada»; `none` → «Sem meta pessoal definida», «Anel sem meta definida», traço tracejado e percentagem «—»; gasto igual à meta (40000/40000, 100 %) → «Reta final · saldo da meta: 0,00 €»; gasto acima (45200) → «Acima da meta pessoal este mês · 52,00 € além da meta» (escolha pelo sinal de `goal_cents − spent_cents`, **não** por `goal_pct`: 40100/40000 com `goal_pct` 100 também diz «além da meta») e traço limitado a 100 %; os seis casos de `overviewFor` mostram 50, 50, 51, 75, 75 e 76 % e as faixas devolvidas, sem as recalcular (passar uma faixa diferente da esperada para o `goal_pct` e confirmar que prevalece a da API). o caso 39900/40000 (`goal_pct` 100, saldo positivo) → «Reta final · saldo da meta: 1,00 €» com 100 %, não o texto de «acima da meta»; com `isCurrentMonth` falso, `goalNote` «Meta atual» e `ariaLabel` «… da meta atual usada». Nenhum texto com «excedeu», «perdeu», «negativo» nem sinal de menos (US1.1 a US1.3, US1.8, US1.10, US1.11, US1.13, US1.14)
- [X] T011 [US1] Criar `src/features/home/ringView.ts`: `ringView(overview, isCurrentMonth)` devolve `{ tone: "ok" | "warn" | "alert" | "none", label, balanceText, percentText, dash, ariaLabel, goalNote }` conforme `contracts/copy.md`; saldo por subtração de inteiros em cêntimos com `formatCents`; sem React. Depende de T010
- [X] T012 [P] [US1] Escrever `src/features/home/GoalRing.test.tsx` (novo; `F-183:`): para cada estado, `role="img"` com o `ariaLabel` da `ringView`; o texto da faixa e o saldo visíveis (a cor nunca sozinha); a nota «A meta pessoal é um objetivo seu, não um limite.» sempre visível, também sem meta; sem meta, «Sem meta pessoal definida», «—» e o botão (`link`) «Definir a minha meta pessoal» com `href` `/definicoes/perfil?editar=meta` (US1.4, US1.5, D-P8); conta anterior ao onboarding (`overviewNoGoal`) mostra o mesmo (US1.12); o gasto do mês aparece em todos os estados; num mês que não é o corrente, a nota «Meta atual» junto da meta (US1.13); nenhum texto proibido de `contracts/copy.md` (US1.6, US1.7)
- [X] T013 [US1] Criar `src/features/home/GoalRing.tsx`: SVG de 148 px (círculo de raio 62, traço 16, `stroke-linecap` redondo, perímetro 390 como `dasharray`), `role="img"` com `aria-label`, percentagem e «da meta» ao centro, «Gasto em mercado no mês», valor, «A sua meta pessoal: …» ou «Sem meta pessoal definida», chip da faixa (cor e texto), nota fixa e `LinkButton` «Definir a minha meta pessoal» sem meta. Recebe `isCurrentMonth`. Cores pelos tokens (`--color-ok`, `--color-alert`, `--color-warn`); transição do traço desligada com `prefers-reduced-motion`. Depende de T009, T011, T012

**Checkpoint**: T010 e T012 verdes; o anel com os seis casos de fronteira e o estado sem meta.

---

## Phase 4: User Story 2 — Média mensal (P1)

**Goal**: o cartão da média mostra valor, tendência e fundo suave só com média, sempre com texto.

**Independent Test**: `AverageCard` com respostas sintéticas.

- [X] T014 [P] [US2] Escrever `src/features/home/AverageCard.test.tsx` (novo; `F-184:`): com média e tendência «abaixo» → valor (`formatCents`), «Últimos 2 meses: 7 % abaixo da média» e fundo verde suave; «acima» → «12 % acima da média», fundo vermelho suave e **nenhum** ícone de alarme; neutro (`average_trend` `on_average`) → «na média» sem fundo colorido (o cliente não aplica limiares); `overviewNoTrend` → o valor da média e «A tendência aparece com mais um mês completo de compras.», sem fundo colorido (US2.7); sem média (`monthly_average_cents` nulo) → «— €» e «Aparece com 2 meses de histórico» (o 2 vem de `average_min_months`, não de uma constante do cliente; «0/2 meses» usa `average_months`) sem fundo colorido; a cor nunca é o único sinal (o texto diz «abaixo», «acima» ou «na média»); `recent_vs_average_pct` negativo = abaixo e o texto mostra o valor absoluto; o cartão é igual em todos os meses (US2.1 a US2.4, US2.6 a US2.8)
- [X] T015 [US2] Criar `src/features/home/AverageCard.tsx` e a função pura `averageView` (em `ringView.ts` ou no próprio ficheiro, se mais simples) com `tone`: `good` | `neutral` | `high` | `none`, derivado de `average_trend` (sem limiares no cliente). Fundo com `bg-ok-soft` e `bg-alert-soft` (tokens existentes); verificar o contraste do texto ≥ 4,5:1 em claro e escuro (US2.5). Depende de T014

**Checkpoint**: T014 verde; contraste do texto no fundo suave medido e registado em `research.md`.

---

## Phase 5: User Story 3 — Estados vazios e composição do ecrã (P1)

**Goal**: o ecrã decide entre conta vazia, poucos dados, mês sem compras, carregamento e erro, sem inventar valores.

**Independent Test**: `HomePage` na tabela real de rotas com msw.

- [X] T016 [P] [US3] Escrever `src/features/home/HomePage.test.tsx` (novo; `F-185:`) com `renderRoutes(routes, "/")` e `serveOverview`: `overviewEmpty` → cartões tracejados anunciados como indisponíveis (não como valores), «A aguardar o seu primeiro talão», «Quanto mais talões registar, mais aprendemos sobre as suas compras.» e `link` «Adicionar talão» para `/adicionar` (US3.1, US3.2, US3.6); `overviewFewData` → cada cartão diz o que falta (US3.3); `overviewZeroMonth` → zeros e anel com meta, **não** o estado vazio (US3.4); resposta atrasada → só o indicador `status`, sem valores nem zeros (US3.7); 500 → «Não foi possível carregar o Início.» com «Tentar de novo» que volta a pedir, sem valores antigos (US3.8); `/` continua a ser a rota; o `<h1>` «Início» existe nos estados com dados e vazios
- [X] T017 [US3] Criar `src/features/home/HomeEmpty.tsx` (estado final com cartões tracejados `border-dashed`, `aria-hidden` nos valores fantasma e texto «A aguardar dados») e `src/features/home/HomePage.tsx`: título «Início», mês (`parseMonth(mes) ?? currentMonth()` da T004, sem seletor: a T021 acrescenta-o; `isCurrentMonth` calcula-se aqui), `useOverview(month)`, `Spinner` a carregar, `Notice` com «Tentar de novo» em erro, `HomeEmpty` com `empty`, senão `GoalRing`, `AverageCard` e os cartões da US4. Em `src/features/home/HomeRoute.tsx`, trocar a página provisória por `HomePage` **mantendo** o redirecionamento do Resumo (F-96), e em `src/features/home/HomeRoute.test.tsx` substituir o F-95 da página provisória («Ver resumo») por um teste que confirma o `<h1>` «Início», mantendo os F-96. Depende de T013, T015, T016

**Checkpoint**: T016 verde; os testes F-96 do redirecionamento continuam verdes. O teste F-95 da página provisória («Ver resumo») fica obsoleto: substituí-lo por um que confirma que `HomeRoute` mostra o `<h1>` «Início» e redireciona os parâmetros do Resumo.

---

## Phase 5b: User Story 3 (continuação) — cache sem valores antigos (R2)

**Goal**: depois de apagar, editar, confirmar ou enviar uma compra, ou de mudar a meta, o Início não mostra valores antigos como atuais (constituição III). As mutações atuais não invalidam `["overview"]` e o `staleTime` é de 30 s.

**Independent Test**: com `["overview", mes]` já na cache, a mutação marca-a como antiga e a leitura seguinte do Início faz um pedido novo (contador do msw).

- [X] T035 [P] [US3] Escrever em `src/features/features.test.tsx` (`F-185:`) um teste por ponto, a falhar primeiro: apagar a compra (`ReceiptPage`), editar e confirmar (`ReviewEditor`, junto do F-15), decidir um duplicado (`DuplicateChoice`, junto do F-17) e terminar o envio (`useUpload`, junto do F-04): em todos, `["overview"]` fica invalidada. A invalidação ao gravar o perfil é da spec 014 (`useSaveProfile`), não desta
- [X] T036 [US3] Acrescentar `void qc.invalidateQueries({ queryKey: ["overview"] })` ao lado das invalidações existentes em `src/features/receipts/ReceiptPage.tsx` (apagar, linhas 302-303; `DuplicateChoice`, linha 152) e `src/features/receipts/ReviewEditor.tsx` (`refresh`, linhas 70-71). Depende de T035
- [X] T037 [US3] O mesmo em `src/features/upload/useUpload.ts` (depois de `invalidateQueries(["receipts"])`, linha 109) sem outra alteração (o `useSaveProfile` é da spec 014). Depende de T035

**Checkpoint**: T035 verde; `lint`, `typecheck` e Vitest completos.

---

## Phase 6: User Story 4 — Gasto, mercados e últimas compras (P2)

**Goal**: compras do mês e anterior, gasto por semana com tabela, «Onde gasta mais» e últimas compras.

**Independent Test**: `SpendCards` com respostas sintéticas.

- [X] T018 [P] [US4] Escrever `src/features/home/SpendCards.test.tsx` (novo; `F-186:`): «Compras no mês 7» e «Mês passado: 11» no mês corrente, «Mês anterior: 11» noutro mês (US4.1); gasto por semana com o intervalo de dias e um valor por semana, **sem** «média por semana» (C15, D-P14) e a tabela alternativa (`DataTable`) acessível por «Ver como tabela», cujos valores batem com a soma do gasto do mês (US4.2); «Onde gasta mais» com inicial, nome, valor (`formatCents`) e percentagem em texto, na ordem recebida (a API ordena), sem depender da cor da barra (US4.3); «Últimas compras» com mercado, data (`formatDate`) e total, e `link` «Ver todas» para `/compras` (US4.4); uma compra que requer revisão ou está em processamento leva texto e ícone, não só cor, não entra em nenhum valor além da sua linha e um total nulo mostra «—» (US4.6; `status` da T001); o ecrã **não** tem «Lista inteligente», «Mesmo produto, mercados diferentes», «mais barato», «poupou», «mais comprados» nem gasto acumulado por dia (US4.5). A forma dos itens segue a T001
- [X] T019 [US4] Criar `src/features/home/SpendCards.tsx` com os quatro cartões; o nome do mercado é o `name` da API (sem `merchantName`); inicial pela primeira letra (importar `initialsOf` de `src/features/onboarding/state.ts`, onde já está exportado; mover para `src/lib` só quando outra spec o usar); barras com `role="img"` e cor ≥ 3:1. Compor em `HomePage.tsx`. Depende de T017, T018

**Checkpoint**: T018 verde.

---

## Phase 7: User Story 6 — Navegar entre meses (P2)

**Goal**: a pessoa muda de mês com o mês no URL.

**Independent Test**: `MonthStepper` e `HomePage` com `?mes=`.

- [X] T020 [P] [US6] Escrever `src/features/home/MonthStepper.test.tsx` e acrescentar casos a `HomePage.test.tsx` (`F-188:`): sem `mes`, mostra «Este mês» e o intervalo e pede `month` do mês corrente; «Mês anterior» muda o URL para o mês anterior (`push`; `router.navigate(-1)` regressa) e pede-o; «Mês seguinte» está desativado no mês corrente e ativo num mês passado; nos meses passados o rótulo diz o mês e o ano; `?mes=lixo` mostra o mês corrente; `?mes=` futuro pede-o e mostra o que vier (zeros); os botões têm nome acessível e o rótulo do mês é `aria-live="polite"` (US6.1 a US6.5)
- [X] T021 [US6] Criar `src/features/home/MonthStepper.tsx` (botões com `ChevronLeft`/`ChevronRight` de 44 px, rótulo e intervalo) e, em `HomePage.tsx`, ler/escrever `mes` com `useSearchParams` usando `parseMonth`, `shiftMonth` e `currentMonth`. Depende de T004, T017, T020

**Checkpoint**: T020 verde.

---

## Phase 8: User Story 5 — Qualidade (P1)

**Goal**: axe, larguras, texto e um só pedido.

**Independent Test**: Vitest de texto e pedidos; Playwright `mock` com axe.

- [X] T022 [P] [US5] Escrever `src/features/home/HomePage.quality.test.tsx` (novo; `F-187:`): contar pedidos com um contador no msw — um único `GET /v1/analytics/overview` por mês mostrado e nenhum a `/v1/analytics/summary` nem `/v1/analytics/consumption` (US5.6); nenhum texto proibido (`contracts/copy.md`: «poupou», «poupar», «economizar», «orçamento», «você», «Chegando lá», «Aguardando», «Sua meta», «mais barato», «excedeu», «perdeu») em nenhum estado (US5.4); nada em `localStorage` nem `sessionStorage` (constituição IV)
- [X] T023 [P] [US5] Em `e2e/mock/ui.spec.ts` (`F-187:`), com `fakeApi(page, { overview })`: axe sem violações em claro e escuro, a 320, 375, 430 e 820 px, para cada estado (verde, laranja, vermelho, acima da meta, sem meta, poucos dados, conta vazia, erro); sem scroll horizontal a 320 px; alvos de toque ≥ 44 px (`boundingBox`) nos botões e ligações; um só pedido a `overview` por mês (`overviewRequests`) (US5.1, US5.2, US5.6). Seguir o padrão do teste `F-99` e do axe do onboarding
- [X] T024 [P] [US5] Em `e2e/mock/ui.spec.ts` (`F-187:`): o Início carregar com atraso mostra só o indicador (sem valores nem zeros) e o erro mostra «Tentar de novo»; o mês no URL sobrevive a um recarregamento
- [X] T025 [US5] Corrigir em `GoalRing.tsx`, `AverageCard.tsx`, `SpendCards.tsx`, `MonthStepper.tsx` e `HomeEmpty.tsx` o que T022 a T024 apontarem (nomes, contraste, tamanhos, `prefers-reduced-motion`), sem alterar comportamento. Depende de T022, T023, T024

**Checkpoint**: T022 a T024 verdes; `e2e:mock` 100 %.

---

## Phase 9: Polish & cross-cutting

- [X] T026 Atualizar os testes existentes afetados por `/` ter passado a pedir `overview` (R11): `src/routes.test.tsx`, `src/components/AppShell.test.tsx`, `src/features/home/HomeRoute.test.tsx`, `src/features/onboarding/OnboardingPage.test.tsx`, `src/features/onboarding/RequireOnboarding.test.tsx` e os e2e `mock` que esperam o título «Início»; devem passar com o handler por omissão da T006/T007. Correr cada ficheiro isolado e corrigir só o necessário
- [X] T027 Atualizar a spec 004 (`specs/004-resumo-analises/spec.md`): registar o anel de três faixas como exceção a «gráficos de série única» (US5.5, D7), com a referência a esta spec. Atualizar `Documentation/README.md` (pendências): a spec 011 implementada (não é git)
- [X] T028 (NÃO corrido: manual) Em `e2e/stack/journey.spec.ts`, confirmar que a jornada continua a chegar ao Início (título «Início») com `overview` real; **manual**, só com o backend a servir `overview`, e a jornada `stack` está desatualizada por outra causa (`Documentation/README.md`, pendências; commit `0a2856f` do backend): registar «não corrido» se não houver backend
- [X] T029 Capturas a 390 px em `Documentation/capturas-inicio/` (fora do git): verde, laranja, vermelho, acima da meta, sem meta, conta vazia, poucos dados, carregamento e erro; claro e escuro nos três primeiros
- [X] T030 Correr `corepack pnpm@9 lint`, `typecheck`, `exec vitest run --maxWorkers=4` e `e2e:mock`; registar o resultado
- [X] T031 Confirmar que a coluna «Tarefas» da tabela de identificadores da `spec.md` (F-183 a F-188) e as referências do `quickstart.md` batem com as tarefas feitas
- [X] T032 Registar F-183 a F-188 no Plano de Testes §5.1 (fora do git). A `PLAN_IDS` do backend **não muda** até os cenários entrarem no Plano de Testes
- [X] T033 Remover do projeto qualquer código ou estilo que não seja usado (por exemplo `--color-warn-soft` se o chip não o usar)
- [X] T034 Correr `/simplify` e repetir T030; mostrar o `git diff --stat`. O commit é da Liz

---

## Dependencies & Execution Order

- **T001 bloqueia tudo o que é código.** Phase 1 → Phase 2 → histórias → Polish.
- **Ordem das histórias:** US1 → US2 → US3 → US4 → US6 → US5. `HomePage.tsx` é criado na T017 e editado nas T019 e T021 (por esta ordem); `GoalRing.tsx`, `AverageCard.tsx`, `SpendCards.tsx`, `MonthStepper.tsx` e `HomeEmpty.tsx` são revistos na T025. **Não** correr em paralelo tarefas que editam o mesmo ficheiro (T017, T019, T021) nem os testes que acrescentam a `HomePage.test.tsx` (T016, T020).
- Dentro de cada história, escrever o teste (T010, T012, T014, T016, T018, T020, T022 a T024) antes da implementação e vê-lo falhar.
- T004 depende de T003; T011 de T010; T013 de T011 e T012; T015 de T014; T017 de T013, T015 e T016; T019 de T017 e T018; T021 de T004, T017 e T020; T025 de T022 a T024.
- A T009 (token `--color-warn`, D-P3 aprovada) antecede a T013.
- As T035 a T037 (cache) vêm depois da T016 e antes da US4; não editam ficheiros de `features/home`.
- O botão «Definir a minha meta pessoal» aponta para `/definicoes/perfil?editar=meta` (a spec 014 do frontend já implementou a edição da meta; D-P8).

## Parallel opportunities

- Fase 2: T003 ‖ T005 ‖ T007; depois T004, T006, T008.
- US1: T010 ‖ T012 (testes de ficheiros diferentes).
- US2 pode correr em paralelo com US1 depois da Fase 2 (T014 ‖ T010 ‖ T012), mas a composição (T017) espera por ambas.
- US5: T022 ‖ T023 ‖ T024.

## Implementation strategy

- **MVP**: Fase 1 a 5 (US1, US2, US3): o anel com os quatro estados, a média e os estados vazios, que é o que o plano pede em «pronto quando». A US4 e a US6 são P2 e entram a seguir; a US5 fecha.
- A T001 é o ponto de decisão: com o contrato por responder, o MVP não arranca. O backend já escreveu o contrato (C1 a C9 e C11 respondidas); faltam o OpenAPI publicado, e C10 (tipos gerados).
- Entrega incremental: validar cada checkpoint com `lint`, `typecheck` e `exec vitest run --maxWorkers=4` antes de seguir.
- Fora desta lista: o cartão da lista e o «mesmo produto, mercados diferentes» (spec 015), a edição da meta (spec 014 do frontend), os totais por mês de Talões (spec 012) e a implementação do endpoint (spec 014 do backend).
