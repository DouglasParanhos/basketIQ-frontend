---

description: "Tarefas da spec 012: Talões (Compras, Resumo e Produtos)"
---

# Tasks: Talões (Compras, Resumo e Produtos)

**Input**: `/specs/012-taloes/` — [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Estado (2026-10-31): especificada, planeada e com tarefas; nada implementado.** Sem bloqueio de contrato: o `openapi.json` do backend (commit `4e327d4`) já tem `GET /v1/analytics/months` e o `ProductSearchItem` enriquecido; a **T001 regenera `src/api/schema.d.ts`** e todas as tarefas de código dependem dela. As decisões D-T1 a D-T17 (spec, Clarifications, e `plan.md`) estão **por confirmar pela Liz**; as tarefas seguem as propostas. **A US4 (papel de talão) está ADIADA** (D-T11): T021 e T022 não se implementam até a Liz dizer onde se abre.

**Tests**: pedidos (constituição VII; testes antes do código, cada um visto a falhar). Identificadores: `F-195` US1 Compras, `F-196` US2 Resumo, `F-197` US3 Produtos, `F-198` US4 papel de talão (adiada), `F-199` US5 qualidade. O nome de cada teste novo começa por `F-195:` … `F-199:`. Os testes existentes de Compras e Produtos **não existem** em Vitest (R10): aqui são testes novos. Os cenários de totais por mês e do preço médio ponderado são «Verificado no Backend»; `scripts/traceability.py` do backend não muda.

**Comandos**: `corepack pnpm@9 <script>` no PowerShell ou Git Bash (não há `pnpm` no PATH nem WSL). Vitest: `corepack pnpm@9 exec vitest run --maxWorkers=4` (um ficheiro de cada vez: `… <ficheiro>`). Playwright (`e2e:mock`) precisa de `pnpm` no PATH (atalho `pnpm.cmd` → `corepack pnpm@9`, fora do repositório) e só corre com o Docker livre. Só dados sintéticos. O commit só depois de `/simplify` (T030).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode correr em paralelo (ficheiros diferentes, sem dependência de tarefa por acabar)
- **[Story]**: US1 Compras · US2 Resumo · US3 Produtos e detalhe · US4 papel de talão (ADIADA) · US5 qualidade

## Phase 1: Setup

- [ ] T001 Linha de base e contrato, sem tocar no backend: correr `lint`, `typecheck`, `exec vitest run --maxWorkers=4` (registar os números); depois `corepack pnpm@9 gen:api` (lê `../basketIQ-backend/openapi.json`, commit `4e327d4`) e conferir em `git diff src/api/schema.d.ts` que existem `/v1/analytics/months`, o tipo `MonthTotalOut` (`month`, `confirmed_count`, `total_cents`) e, em `ProductSearchItem`, `avg_price_cents` (inteiro ou nulo), `price_basis`, `purchases` e `merchants`; `typecheck` tem de continuar limpo (o `as` do `ProfilePatch` da spec 014 mantém-se). Se o repositório do backend não estiver acessível, ou o `openapi.json` não tiver o endpoint, **parar** e escrever em `Documentation/PENDENTE_dia_frontend_2026-10-31.md` o bloqueio; não editar o `schema.d.ts` à mão (constituição VI)
- [ ] T002 [P] Mocks e fixtures (só dados sintéticos): em `src/test/fixtures.ts`, `monthTotals` (`[{ month: "2026-10", confirmed_count: 7, total_cents: 24800 }, { month: "2026-09", confirmed_count: 5, total_cents: 32200 }, { month: "2025-12", confirmed_count: 2, total_cents: 5000 }]`), `receiptItem(overrides)` (`ReceiptSummaryOut` completo com `merchant_name`, `store_label`, `line_count`, `needs_action`), `productItem(overrides)` (com `avg_price_cents`, `price_basis`, `purchases`, `merchants`) e `productAnalytics()` com `history` (com `raw_description`) e `by_merchant`; em `src/test/server.ts`, handlers por omissão de `GET /v1/analytics/months` e `GET /v1/products` e os ajudantes `serveMonths(body | "error")` e `serveReceipts(pages)` (páginas por cursor, devolve os pedidos vistos); em `e2e/mock/api.ts`, `months`, compras de meses e estados diferentes (confirmada de outubro e de setembro, `REVIEW_REQUIRED`, `EXTRACTING`, `UNREADABLE`), produtos enriquecidos (um com `avg_price_cents: null`) e `FakeState.months`. Os testes existentes têm de continuar verdes com os handlers novos. Depende de T001

---

## Phase 2: Foundational (bloqueia as histórias)

- [ ] T003 [P] Escrever `src/features/receipts/months.test.ts` (novo; `F-195:`) e acrescentar a `src/lib/lib.test.ts` os de `status.ts`, a falhar primeiro: `monthKey` — `purchase_at` «2026-10-31T23:30:00Z» e «2026-11-01T00:30:00+00:00» dão «2026-10» e «2026-11» **em hora de Lisboa** (a compra às 00:30 de 1 de novembro conta em novembro); sem `purchase_at` usa `created_at`; `yearOf` pela mesma regra; `groupByMonth` — itens fora de ordem (a API ordena por `created_at`) saem ordenados por data decrescente e agrupados por mês, com o rótulo «Outubro 2026»; `headerText` — «Todas» ou «Confirmadas» com o mês em `months`: «Outubro 2026 · 7 confirmados · 248,00 €» e, com `confirmed_count` 1, «1 confirmado»; mês sem confirmadas, filtro «Requer ação» ou `months` em falta: só «Outubro 2026»; `yearsToShow(months, hoje)` — `{ ano corrente } ∪ anos de months`, decrescentes, sem repetidos; `defaultYear(months, hoje)` — o ano corrente, ou o mais recente de `months` se o corrente não tem nenhum e há outros (D-T14); `needsMore(items, year, hasNext)` — verdadeiro enquanto `hasNext` e `year(created_at do último item) >= year`; falso quando o último foi enviado antes do ano ou não há mais páginas; `status.ts` — `ATTENTION` = `REVIEW_REQUIRED`, `COMPLETED`; `ERRORS` = `INVALID_FORMAT`, `UNREADABLE`, `UNSUPPORTED_MERCHANT`, `TEMPORARY_FAILURE`, `PERMANENT_FAILURE`; `rowState(status)` dá `attention`, `progress`, `error` ou `confirmed` pela tabela de `data-model.md`. Depende de T001
- [ ] T004 Criar `src/features/receipts/months.ts` (puro, sem React; fuso de Lisboa como `src/lib/period.ts`) com `monthKey`, `yearOf`, `groupByMonth`, `headerText`, `yearsToShow`, `defaultYear` e `needsMore`, e acrescentar a `src/lib/status.ts` `ATTENTION`, `ERRORS` e `rowState`, sem alterar o que já existe (`STATUS`, `IN_PROGRESS`, `EDITABLE`, `isTerminal`). Valores de dinheiro só por `formatCents`; nada de somas nem médias. Depende de T003
- [ ] T005 [P] Escrever `src/features/receipts/invalidation.test.tsx` (novo; `F-195:`), um teste por ponto, a falhar primeiro: em todos, depois da ação, `["months"]` e `["overview"]` ficam inválidas (espiar `client.invalidateQueries` ou ler o `isInvalidated` do estado das queries semeadas com `setQueryData`): (a) apagar a compra em `ReceiptPage`; (b) decidir um duplicado em `DuplicateChoice`; (c) editar e confirmar em `ReviewEditor` (`refresh`); (d) terminar o envio em `useUpload` (junto do F-04). Eliminar só o original **não** invalida `months` (não muda totais; ver `research.md` R8). Depende de T001, T002
- [ ] T006 Criar `src/features/receipts/cache.ts` com `invalidateReceiptData(qc)` (D-T16): invalida `["receipts"]`, `["months"]` e `["overview"]`; ligá-lo, sem outra alteração, em `src/features/receipts/ReceiptPage.tsx` (apagar e `DuplicateChoice`, onde hoje se invalida `["receipts"]`), em `src/features/receipts/ReviewEditor.tsx` (`refresh`) e em `src/features/upload/useUpload.ts` (depois de `process`, no lugar de `invalidateQueries(["receipts"])`); as invalidações de `["summary"]` e de `["receipt", id]` ficam onde estão. Se a spec 011 já criou o auxiliar, reutilizá-lo. Depende de T005
- [ ] T007 [P] Criar `src/features/taloes/useMonths.ts`: `useQuery` com `queryKey: ["months"]` e `GET /v1/analytics/months` através de `api`/`unwrap`, devolvendo `MonthTotalOut[]`; em erro devolve a consulta com `isError` (os ecrãs tratam como «sem totais»). Depende de T001, T002

**Checkpoint**: `lint`, `typecheck` e Vitest completos verdes; os testes existentes continuam verdes com os handlers novos.

---

## Phase 3: User Story 1 — Aba Compras (P1) 🎯 MVP

**Goal**: a lista agrupada por mês com os totais do endpoint, selos pelo estado, contador de «Requer ação» e seletor de ano.

**Independent Test**: `ReceiptsPage.test.tsx` com a API simulada (meses, estados mistos, várias páginas); `TaloesLayout.test.tsx` para o título e o seletor.

- [ ] T008 [P] [US1] Adaptar `src/features/taloes/TaloesLayout.test.tsx` e acrescentar (`F-195:`), a falhar primeiro: o layout tem `<h1>` «Talões» e as abas; o seletor de ano (`getByRole("button", { name: /ano/i })` ou `combobox` «Ano», conforme o componente) só existe em `/compras` e **não** em `/compras/resumo` nem em `/produtos`; as opções são o ano corrente e os anos de `months` (2026, 2025), decrescentes; escolher 2025 põe `?ano=2025` no URL com `replace` (Voltar não passa por ele); o ano por defeito não se escreve no URL; um `?ano=1999` ou `?ano=abc` é ignorado (valores válidos: «2000 a 2099»); mudar para a aba Resumo não leva o `ano`. Depende de T007
- [ ] T009 [P] [US1] Adaptar `src/routes.test.tsx` (F-97, F-98) ao novo título: o `h1` «Talões» está nas três abas e **não** no detalhe da compra nem no do produto; «resumo» continua a não ser `:id`; o F-98 de `/definicoes` fica como está. Os testes têm de falhar primeiro onde dependem do `h1` antigo (`Compras`, `Produtos`, `Resumo`). Depende de T007
- [ ] T010 [P] [US1] Escrever `src/features/receipts/ReceiptsPage.test.tsx` (novo; `F-195:`) com `serveReceipts` e `serveMonths`, a falhar primeiro: (1) cabeçalhos por mês com `months`: «Outubro 2026 · 7 confirmados · 248,00 €» e «Setembro 2026 · 5 confirmados · 322,00 €», o total do cabeçalho **não** é a soma da lista carregada (a lista tem 2 itens de outubro); (2) mês com compras só por rever ou em processamento: só o nome do mês; em «Requer ação»: só o nome do mês; com `months` a falhar: lista sem totais e sem aviso de erro; (3) os três filtros e o URL `?filtro=acao`/`confirmadas` como hoje (o pedido leva `status` do filtro); (4) o chip «Requer ação · 2» vem de um pedido com `status` dos estados do filtro e `limit=100`; com 100 itens mostra «Requer ação · 99+»; atualiza ao invalidar `["receipts"]`; (5) linha por estado: `REVIEW_REQUIRED` e `COMPLETED` têm o texto «rever valores», o emblema «!» (`aria-hidden`) e o texto só para leitores de ecrã «Requer ação: rever valores»; `EXTRACTING` tem «a ler o talão…», total «—» e emblema «…»; `UNREADABLE` mostra «Documento ilegível» com ícone e **sem** «rever valores» (embora `needs_action` seja verdadeiro); `CONFIRMED` sem selo; o selo vem do `status`, nunca de `needs_action` (um item `CONFIRMED` com `needs_action: true` não tem selo); inicial do mercado e nome por `merchantName(code, merchant_name)`; «1 item» no singular; (6) o estado nunca só por cor: cada selo tem texto; (7) ano: com `?ano=2025`, itens de 2025 (por `purchase_at`) mostram-se e os de 2026 não; o efeito pede a página seguinte enquanto o último item carregado foi **enviado** (`created_at`) em ano ≥ 2025 e para quando um item foi enviado antes de 2025 ou `next_cursor` é nulo (contar os pedidos); em «Requer ação» o ano não se aplica (D-T15); ano por defeito sem compras e outros anos em `months` abre o mais recente com compras (D-T14); (8) lista vazia: «Ainda não há compras» com «Adicionar a primeira nota», e filtro ou ano vazios: «Nada nesta lista»; (9) uma compra a ser lida muda para confirmada ao repetir o pedido (sondagem de 3 s, com relógio simulado); (10) cada linha liga a `/compras/:id`; (11) já não há a ligação «Produtos» no cabeçalho (D-T5). Depende de T002, T004, T007
- [ ] T011 [US1] Criar `src/features/taloes/YearSelect.tsx` (seletor de 44 px, `aria-label` «Ano», anos de `yearsToShow`, parâmetro `ano` com `replace`, valor por defeito de `defaultYear` sem o escrever) e alterar `src/features/taloes/TaloesLayout.tsx`: `<h1>` «Talões» à esquerda e, só quando o caminho é `/compras`, o `YearSelect` à direita; as abas por baixo; o `Suspense` mantém-se. Depende de T008, T009
- [ ] T012 [P] [US1] Criar `src/features/receipts/ReceiptRow.tsx`: ligação a `/compras/:id` com o azulejo da inicial (`aria-hidden`), o emblema por cima (`!` dourado com `--color-marker`, `…` neutro, ícone de alerta nos erros), nome, `store_label` pequeno se existir, data a negrito só no estado de atenção, «N itens» (singular «1 item»), o texto do estado e o total (`formatCents` ou «—» em processamento); texto só para leitores de ecrã por estado; alvo ≥ 44 px; tokens do repositório (sem as cores do protótipo). Depende de T004, T010
- [ ] T013 [US1] Reescrever `src/features/receipts/ReceiptsPage.tsx` mantendo a lógica: `useInfiniteQuery` com a chave `["receipts", filtro]` e o cursor, sondagem de 3 s enquanto houver itens em `IN_PROGRESS`; `useMonths`; contador do chip por `useQuery` `["receipts","action-count"]` (`status` do filtro, `limit=100`, «99+» com 100); itens reordenados por data da compra e agrupados com `groupByMonth`; cabeçalho por `headerText`; ano de `?ano` (ou `defaultYear`) aplicado a «Todas» e «Confirmadas» mas não a «Requer ação»; efeito que chama `fetchNextPage` enquanto `needsMore`, com «A carregar…»; «Carregar mais» mantém-se; `<h2>` só para leitores de ecrã «Compras» em vez do `PageHeader` e sem a ligação «Produtos»; vazio e erros como na `copy.md`. Depende de T011, T012
- [ ] T014 [US1] Confirmar que `F-22a` (`features.test.tsx`) e os testes de `ReceiptPage`/`ReviewEditor` continuam verdes, e que eliminar uma compra depois de aberta pela lista volta a `/compras` com a lista e os totais atualizados (cobre a invalidação da T006); adaptar só os seletores, nunca as asserções de valores. Depende de T013

**Checkpoint**: T008 a T010 verdes; `lint`, `typecheck` e Vitest completos.

---

## Phase 4: User Story 2 — Aba Resumo (P1)

**Goal**: o `DashboardPage` reestilizado sem mudar pedidos, URL nem valores.

**Independent Test**: os testes `dashboard` de `features.test.tsx` passam com mudanças só de seletores.

- [ ] T015 [P] [US2] Adaptar `src/features/features.test.tsx` (`describe("dashboard (RF-09, RF-11)")`) e acrescentar (`F-196:`), a falhar primeiro onde dependem do desenho antigo: o ecrã **não** tem «Olá» (D-T10); tem `<h2>` «Resumo» só para leitores de ecrã e nenhum `<h1>`; o grupo «Período» tem Mês, Trimestre, Ano e Intervalo e as setas «Período anterior» e «Período seguinte»; o seletor chama-se «Todos os mercados» (valor vazio) e filtra com `?mercado=` como hoje (F-19 mantém a asserção do pedido); o bloco chama-se «Por mercado»; «Ver como tabela» abre «Gasto por período» (já recolhida); os valores de F-18 (`455,00 €`, `+12,5 % face a`) e o estado vazio de F-21 mantêm-se **sem alterar as asserções de valores**; «Consumo habitual» continua e some sem dados; o filtro do produto vem de «Filtrar resumo» e o chip tem «Remover filtro do produto …». Depende de T001, T002
- [ ] T016 [US2] Reestilizar `src/features/dashboard/DashboardPage.tsx` e `src/features/dashboard/PeriodPicker.tsx` segundo `TaloesV2.dc.html` (cartão «Gasto em mercado · N talões», total, etiqueta de variação, pílulas de 44 px, `Todos os mercados`, «Por mercado»), sem tocar nos `useQuery`, nas chaves de cache, nos parâmetros do URL (`periodo`, `de`, `ate`, `mercado`, `produto`, `produto_nome`) nem em `src/lib/period.ts`; retirar a saudação; `<h1>` «Resumo» passa a `<h2>` `sr-only`; manter o estado vazio «Comece pela primeira nota» e o rodapé. Depende de T015

**Checkpoint**: T015 verde e os testes de F-18, F-19, F-21 sem asserções de valores alteradas.

---

## Phase 5: User Story 3 — Aba Produtos e detalhe (P1)

**Goal**: a lista com preço médio e contagens, a ordenação no cliente e o detalhe sem ranking.

**Independent Test**: `ProductsPage.test.tsx` e `ProductPage.test.tsx` (novos) com `productItem` e `productAnalytics`.

- [ ] T017 [P] [US3] Escrever `src/features/products/ProductsPage.test.tsx` e `src/features/products/sort.test.ts` (novos; `F-197:`), a falhar primeiro: o pedido leva `limit=100` e `q` quando há pesquisa; cada linha mostra o nome, «4 compras · 3 mercados» («1 compra», «1 mercado» no singular) e «5,52 € /kg» com «preço médio»; `price_basis` `l` mostra «/l» e `un` mostra «/un.»; `avg_price_cents: null` **não** mostra preço (só «sem preço médio» para leitores de ecrã); a ordem por defeito é «Mais comprados» (`purchases` decrescente, empate por nome); `?ordem=gasto` ordena por `spent_cents` decrescente e `?ordem=az` por nome em português (`localeCompare("pt-PT")`, «Água» antes de «Banana»); `?ordem=xyz` ignora-se; escolher a ordem muda o URL com `replace` sem novo pedido à API; a pesquisa mantém-se no servidor; os estados vazios da `copy.md`; cada linha liga a `/produtos/:id`; nenhum texto «mais barato». Depende de T002
- [ ] T018 [P] [US3] Escrever `src/features/products/ProductPage.test.tsx` (novo; `F-197:`), a falhar primeiro: preço médio por kg (ou litro, unidade) com a nota «Média ponderada pelas quantidades que comprou»; os três valores Mínimo, Máximo e Comprou (`total_quantity` formatada, «4,8 kg»); evolução com um ponto por compra e a tabela «Histórico de compras» com a coluna «Descrição original» preenchida por `raw_description`; **a frase «A descrição original de cada compra fica guardada no histórico» não aparece** (D-T3); «Por mercado, nos seus talões» com, por mercado, nome, média, «· último …» e «N compras» (singular «1 compra»), **na ordem recebida** (um mock com mercados em ordem não alfabética de preço mantém a ordem da API e nenhum tem etiqueta «mais barato»); nenhum texto «90 dias» (D-T2); `insufficient_data` mostra «É preciso comprar este produto mais vezes para ver a evolução do preço.»; `mixed_units` mostra a nota das unidades; `<h1>` com o nome e botão «Voltar aos produtos» com 44 px. Depende de T002
- [ ] T019 [US3] Criar `src/features/products/sort.ts` (puro: `parseOrder(valor)` e `sortProducts(items, ordem)` pelos critérios de `data-model.md`) e reescrever `src/features/products/ProductsPage.tsx`: `limit: 100`, pesquisa «Pesquisar produto» (`label`), grupo «Ordenar produtos» com Mais comprados, Mais gastos e A–Z (pílulas de 44 px, `aria-checked`), linhas conforme a `copy.md`, `<h2>` só para leitores de ecrã «Produtos»; a lógica de `useDeferredValue`, `keepPreviousData` e do `?q=` mantém-se. Depende de T017
- [ ] T020 [US3] Reestilizar `src/features/products/ProductPage.tsx` conforme `copy.md` e R7: cartão do preço médio com a nota, três valores, «Evolução do preço» (o `PriceLine` e o `DataTable` existentes), coluna «Descrição original» na tabela, bloco «Por mercado, nos seus talões» com `by_merchant` na ordem da API, sem etiqueta nem ordenação por preço e sem janela de dias; sem a frase de D-T3; manter `mixed_units` e `insufficient_data`. Depende de T018

**Checkpoint**: T017 e T018 verdes.

---

## Phase 6: User Story 4 — Lista em papel de talão (P3) — ADIADA (D-T11)

**Não implementar** até a Liz decidir onde se abre esta vista (o desenho não mostra o ponto de entrada). Ficam escritas para o dia em que for pedida.

- [ ] T021 [US4] ADIADA: escrever `src/features/receipts/ReceiptPaper.test.tsx` (`F-198:`): os talões do mês em papel de talão (`.receipt-paper`, `--font-receipt`) com a mesma informação e os mesmos estados da lista, «REVER» marcado a amarelo com texto, linha «TOTAL CONFIRMADO» com o total de `months`; contraste ≥ 4,5:1 no axe (claro e escuro)
- [ ] T022 [US4] ADIADA: `src/features/receipts/ReceiptPaper.tsx` e o seu ponto de entrada (por exemplo «Ver como papel de talão» na aba Compras), conforme a decisão da Liz. Depende de T021

---

## Phase 7: User Story 5 — Qualidade (P1)

**Goal**: acessibilidade, larguras, alvos, texto e armazenamento verificados.

- [ ] T023 [P] [US5] Escrever `src/features/taloes/TaloesQuality.test.tsx` (novo; `F-199:`): nenhum texto proibido (`/mais barato|ranking|poupou|orçamento|você|90 dias/i`) em Compras, Resumo, Produtos e no detalhe do produto; os mercados aparecem por texto e inicial, sem `img` de logótipo; o selo de atenção tem emblema, «rever valores» e o texto de leitor de ecrã (RF-07); nenhum dado em `localStorage` nem `sessionStorage` nas quatro vistas; teclado: Tab chega às abas, aos filtros, ao seletor de ano e às linhas pela ordem visual, e as setas movem as abas (spec 009). Depende de T013, T016, T019, T020
- [ ] T024 [P] [US5] Em `e2e/mock/ui.spec.ts` (`F-199:`), com `fakeApi(page, …)` e os estados de T002: axe sem violações e sem scroll horizontal em Compras (com o seletor de ano e o chip «Requer ação · N»), Resumo, Produtos e o detalhe do produto, em claro e escuro, a 320, 375, 430 e 820 px; teste dos 44 px (`main button:visible, main a:visible, main [role=tab]:visible, main [role=radio]:visible, main input:visible`, ignorando etiquetas que não envolvem controlo, como em `F-194`) a 320 px nas quatro vistas, incluindo o seletor de ano, os chips e as pílulas; fluxos: abrir a lista, filtrar «Requer ação», abrir uma compra e voltar com o filtro; escolher 2025 mostra só compras desse ano; ordenar produtos por A–Z; abrir um produto sem «mais barato»; os testes `F-99` (`/compras`, `/compras/resumo`, `/produtos`), `F-21` e «chart has a textual alternative» adaptados aos seletores novos sem alterar as asserções. Depende de T002, T013, T016, T019, T020
- [ ] T025 [US5] Adaptar `e2e/stack/journey.spec.ts` (F-18, F-19, F-20, F-22: o resumo de setembro, o filtro Lidl, o histórico do produto e apagar uma compra) aos seletores novos; **manual**, só com a stack completa a correr e a jornada ainda desatualizada por outra causa (HANDOFF, commit `0a2856f` do backend): registar «não corrido» se não houver backend. Depende de T024
- [ ] T026 [US5] Corrigir nos ecrãs o que T023 e T024 apontarem (nomes acessíveis, contraste, tamanhos, foco, o encolher de botões como o da spec 014), sem alterar comportamento. Depende de T023, T024

**Checkpoint**: T023 e T024 verdes; `e2e:mock` a 100 %.

---

## Phase 8: Polish e fecho

- [ ] T027 Capturas a 390 px em `Documentation/capturas-taloes/` (fora do git), claro e escuro: Compras (com cabeçalhos, selos e contador), Compras com o seletor de ano aberto, Resumo, Produtos, detalhe do produto. Só se a spec for implementada. Depende de T026
- [ ] T028 Documentos fora do git: registar F-195 a F-199 na Especificação Funcional §12.4 e no HANDOFF (o estado da spec 012); acrescentar uma nota nas specs `004-resumo-analises` e `005-produtos` («reestiladas pela 012; comportamento igual»); atualizar `Documentation/PENDENTE_dia_frontend_2026-10-31.md`. Depende de T026
- [ ] T029 Correr `corepack pnpm@9 lint`, `typecheck`, `exec vitest run --maxWorkers=4` e `e2e:mock` (só com o Docker livre; se não responder, parar e registar); registar o resultado. Depende de T026
- [ ] T030 Correr `/simplify` sobre o diff e repetir T029; mostrar o `git diff --stat`. O commit só depois disto. Depende de T029

---

## Dependencies & Execution Order

- T001 (contrato) → tudo o resto. T002 [P] com nada além de T001.
- Fundação: T003 → T004; T005 → T006; T007 [P]. As três linhas podem avançar em paralelo depois de T001/T002.
- US1 (T008 a T014) depende da fundação (T004, T006, T007). US2 (T015, T016) só depende de T001 e T002 e **não** de US1. US3 (T017 a T020) só depende de T001 e T002.
- US4 (T021, T022) fica ADIADA; não bloqueia nada.
- US5 (T023 a T026) depende de US1, US2 e US3 implementadas.
- T006 toca `ReceiptPage.tsx`, `ReviewEditor.tsx` e `useUpload.ts`: coordenar com T035 a T037 da spec 011 (D-T16); quem chegar primeiro cria o auxiliar.
- Dentro de cada história, escrever o teste (T003, T005, T008 a T010, T015, T017, T018, T023, T024) antes da implementação e vê-lo falhar.

## Parallel Opportunities

- Fundação: T003 ‖ T005 ‖ T007.
- US1: T008 ‖ T009 ‖ T010; depois T012 ‖ (T011 depois dos seus testes).
- US2 ‖ US3 ‖ US1 depois da fundação (ficheiros diferentes: `dashboard/`, `products/`, `receipts/`+`taloes/`).
- US3: T017 ‖ T018.
- US5: T023 ‖ T024.

## Implementation Strategy

- **MVP**: Fase 1 + Fase 2 + US1 (a lista de Compras com totais por mês, selos e ano). Já entrega o que o plano mais pede e o único endpoint novo.
- Depois US3 (os produtos têm o contrato novo mais visível) e US2 (só aparência), por esta ordem ou em paralelo.
- US5 fecha a entrega; a US4 só entra por decisão da Liz.
- O lançamento da UX v2 não depende desta spec (depende da 014); mas a Fase 4 do plano fecha com ela.
